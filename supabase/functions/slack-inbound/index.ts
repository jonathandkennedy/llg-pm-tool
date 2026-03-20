// ─── slack-inbound/index.ts ─────────────────────────────────────────────────
// Supabase Edge Function: Slack messages → PM tool database
// Messages in department channels get logged and matched to projects/tasks.
//
// Deploy: supabase functions deploy slack-inbound --no-verify-jwt
// Secrets: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SUPABASE_SERVICE_ROLE_KEY
//
// Event Subscriptions Request URL:
//   https://eifrudtwwojllvwzzryo.supabase.co/functions/v1/slack-inbound
// ────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SLACK_API = 'https://slack.com/api'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-slack-signature, x-slack-request-timestamp',
}

// Channel → department mapping (reverse of outbound)
const CHANNEL_TO_DEPT: Record<string, string> = {
  seo: 'seo',
  dev: 'dev',
  design: 'design',
  social: 'social',
  ppc: 'ppc',
  admin: 'admin',
  intakes: 'intakes',
}

// ─── Signature Verification ─────────────────────────────────────────────────

async function verifySlackSignature(body: string, timestamp: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const baseString = `v0:${timestamp}:${body}`
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `v0=${hex}` === signature
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const rawBody = await req.text()
  const signingSecret = Deno.env.get('SLACK_SIGNING_SECRET')
  const botToken = Deno.env.get('SLACK_BOT_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://eifrudtwwojllvwzzryo.supabase.co'
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  // ── Verify signature ──────────────────────────────────────────────────
  if (signingSecret) {
    const timestamp = req.headers.get('x-slack-request-timestamp') || ''
    const signature = req.headers.get('x-slack-signature') || ''
    if (timestamp && signature) {
      const valid = await verifySlackSignature(rawBody, timestamp, signature, signingSecret)
      if (!valid) {
        return new Response('Invalid signature', { status: 401, headers: corsHeaders })
      }
    }
  }

  const payload = JSON.parse(rawBody)

  // ── URL verification challenge ────────────────────────────────────────
  if (payload.type === 'url_verification') {
    return new Response(JSON.stringify({ challenge: payload.challenge }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Event callback ────────────────────────────────────────────────────
  if (payload.type === 'event_callback') {
    const event = payload.event

    // Ignore bot messages to prevent loops
    if (event.bot_id || event.subtype === 'bot_message') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Handle channel messages
    if (event.type === 'message' && !event.subtype) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey!)

        // ── Get channel name ────────────────────────────────────────────
        const channelRes = await fetch(`${SLACK_API}/conversations.info?channel=${event.channel}`, {
          headers: { 'Authorization': `Bearer ${botToken}` },
        })
        const channelData = await channelRes.json()
        const channelName = channelData.ok ? channelData.channel.name : event.channel

        // ── Get user info ───────────────────────────────────────────────
        const userRes = await fetch(`${SLACK_API}/users.info?user=${event.user}`, {
          headers: { 'Authorization': `Bearer ${botToken}` },
        })
        const userData = await userRes.json()
        const userName = userData.ok ? (userData.user.real_name || userData.user.name) : 'Unknown'
        const userEmail = userData.ok ? userData.user.profile?.email : null

        // ── Determine department from channel ───────────────────────────
        const department = CHANNEL_TO_DEPT[channelName] || null

        // ── Check if message mentions a client/project ──────────────────
        // Look for project names or client names in the message text
        const messageText = event.text || ''

        let matchedProject = null

        // Try to find a project mentioned in the message
        const { data: allProjects } = await supabase
          .from('projects')
          .select('id, name, client_id')
          .in('lifecycle_type', ['PRE_LAUNCH', 'POST_LAUNCH'])

        if (allProjects) {
          for (const proj of allProjects) {
            // Check if project name or first word of project name appears in message
            const projWords = proj.name.toLowerCase().split(' ')
            const msgLower = messageText.toLowerCase()
            if (msgLower.includes(proj.name.toLowerCase()) || 
                (projWords[0].length > 3 && msgLower.includes(projWords[0]))) {
              matchedProject = proj
              break
            }
          }
        }

        // ── If we matched a project, create a portal update ─────────────
        if (matchedProject) {
          await supabase.from('updates').insert([{
            client_id: matchedProject.client_id,
            project_id: matchedProject.id,
            type: department ? department.toUpperCase() : 'Slack',
            text: `${userName} in #${channelName}: ${messageText.substring(0, 300)}`,
            color: '#4A154B',
          }])

          console.log(`Matched message to project: ${matchedProject.name}`)
        }

        // ── Always log to webhook_logs ───────────────────────────────────
        await supabase.from('webhook_logs').insert([{
          source: 'slack',
          event_type: 'message',
          payload: {
            channel: channelName,
            department,
            user_name: userName,
            user_email: userEmail,
            text: messageText.substring(0, 500),
            matched_project: matchedProject?.name || null,
            ts: event.ts,
          },
        }])

        // ── Log to activity_log if matched ──────────────────────────────
        if (matchedProject) {
          await supabase.from('activity_log').insert([{
            entity_type: 'project',
            entity_id: matchedProject.id,
            action: 'slack_message',
            metadata: {
              channel: channelName,
              department,
              user_name: userName,
              text: messageText.substring(0, 500),
            },
          }])
        }

      } catch (err) {
        console.error('Error processing Slack message:', err)
      }
    }
  }

  return new Response('ok', { headers: corsHeaders })
})