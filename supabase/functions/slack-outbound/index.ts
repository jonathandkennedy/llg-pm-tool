// ─── slack-outbound/index.ts ────────────────────────────────────────────────
// Supabase Edge Function: PM tool events → Slack department channels
//
// Routing logic:
//   Task changes → department channel (#seo, #dev, #design, etc.) + #all-updates
//   Escalations → #sla-alerts + department channel + #all-updates
//   New tickets → #client-tickets + department channel + #all-updates
//   Launch stage → #launch-calendar + #all-updates
//   Approvals → #approvals + #all-updates
//
// Deploy: supabase functions deploy slack-outbound --no-verify-jwt
// Secrets:
//   SLACK_BOT_TOKEN=xoxb-...
//   PORTAL_URL=https://ops.llgportal.com
// ────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SLACK_API = 'https://slack.com/api'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Department → Channel mapping ───────────────────────────────────────────

const DEPT_CHANNELS: Record<string, string> = {
  seo: 'seo',
  dev: 'dev',
  design: 'design',
  social: 'social',
  ppc: 'ppc',
  content: 'seo',       // Content tasks route to #seo (same team)
  admin: 'admin',
  intakes: 'intakes',
  operations: 'admin',
  systems: 'admin',
  sales: 'admin',
  qa: 'seo',             // QA routes to #seo for now
  executive: 'admin',
}

function getDeptChannel(department: string | null): string {
  if (!department) return 'all-updates'
  return DEPT_CHANNELS[department.toLowerCase()] || 'all-updates'
}

// ─── Slack API helpers ──────────────────────────────────────────────────────

async function slackPost(method: string, body: Record<string, any>, token: string) {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function postToChannel(channel: string, text: string, blocks: any[], token: string) {
  const result = await slackPost('chat.postMessage', { channel, text, blocks, unfurl_links: false }, token)
  if (!result.ok && result.error === 'channel_not_found') {
    console.warn(`Channel #${channel} not found, skipping`)
  }
  return result
}

async function postToMultiple(channels: string[], text: string, blocks: any[], token: string) {
  // Deduplicate channels
  const unique = [...new Set(channels.filter(Boolean))]
  await Promise.allSettled(unique.map(ch => postToChannel(ch, text, blocks, token)))
}

async function sendDM(userEmail: string, text: string, blocks: any[], token: string) {
  const lookup = await slackPost('users.lookupByEmail', { email: userEmail }, token)
  if (!lookup.ok) { console.warn('Slack user not found:', userEmail); return }
  const dm = await slackPost('conversations.open', { users: lookup.user.id }, token)
  if (!dm.ok) { console.warn('Could not open DM'); return }
  return postToChannel(dm.channel.id, text, blocks, token)
}

// ─── Message Builders ───────────────────────────────────────────────────────

function taskStatusBlocks(data: any, portalUrl: string) {
  const emoji: Record<string, string> = {
    complete: '✅', in_progress: '🔵', ready_for_qa: '🟡', manager_review: '🟣',
    waiting_on_client: '🔴', escalated: '🚨', new_this_cycle: '⚪', scheduled: '🟢',
    design: '🎨', development: '💻', internal_qa: '🔍', client_review: '👀',
    intake_admin: '📥', setup_config: '⚙️',
  }
  const e = emoji[data.new_status] || '📋'
  const label = (data.new_status || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

  return [
    { type: 'section', text: { type: 'mrkdwn', text: `${e} *Task status changed*\n*${data.task_title}*` } },
    { type: 'context', elements: [
      { type: 'mrkdwn', text: `*${data.project_name}* · ${data.assignee || 'Unassigned'} · ${data.department || 'No dept'}` },
    ]},
    { type: 'context', elements: [
      { type: 'mrkdwn', text: `Status: ~${(data.old_status || '').replace(/_/g, ' ')}~ → *${label}*` },
    ]},
    { type: 'actions', elements: [
      { type: 'button', text: { type: 'plain_text', text: 'View Task' }, url: `${portalUrl}/#task/${data.task_id}`, action_id: 'view_task' },
    ]},
  ]
}

function escalationBlocks(data: any, portalUrl: string) {
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `🚨 *ESCALATED TASK*\n*${data.task_title}*` } },
    { type: 'context', elements: [
      { type: 'mrkdwn', text: `*${data.project_name}* · Assigned: *${data.assignee || 'Unassigned'}* · Due: *${data.due_date || 'No date'}* · Dept: *${data.department || '—'}*` },
    ]},
    { type: 'actions', elements: [
      { type: 'button', text: { type: 'plain_text', text: 'View Task' }, url: `${portalUrl}/#task/${data.task_id}`, style: 'danger', action_id: 'view_escalation' },
    ]},
  ]
}

function ticketBlocks(data: any, portalUrl: string) {
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `🎫 *New support ticket*\n*${data.title}*` } },
    { type: 'section', text: { type: 'mrkdwn', text: data.description ? `> ${data.description.substring(0, 200)}${data.description.length > 200 ? '...' : ''}` : '_No description_' } },
    { type: 'context', elements: [
      { type: 'mrkdwn', text: `Client: *${data.client_name}* · Assigned: *${data.assigned_to || 'Unassigned'}*` },
    ]},
    { type: 'actions', elements: [
      { type: 'button', text: { type: 'plain_text', text: 'View Ticket' }, url: `${portalUrl}/#tickets`, action_id: 'view_ticket' },
    ]},
  ]
}

function launchStageBlocks(data: any, portalUrl: string) {
  const emoji: Record<string, string> = {
    intake_admin: '📥', setup_config: '⚙️', design: '🎨', development: '💻',
    internal_qa: '🔍', client_review: '👀', launch_scheduled: '🚀',
  }
  const e = emoji[data.new_stage] || '📋'
  const label = (data.new_stage || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

  return [
    { type: 'section', text: { type: 'mrkdwn', text: `${e} *Launch stage changed*\n*${data.project_name}*` } },
    { type: 'context', elements: [
      { type: 'mrkdwn', text: `~${(data.old_stage || '').replace(/_/g, ' ')}~ → *${label}* · Owner: *${data.owner || 'Unassigned'}*` },
    ]},
    { type: 'actions', elements: [
      { type: 'button', text: { type: 'plain_text', text: 'View Project' }, url: `${portalUrl}/#project/${data.project_id}`, action_id: 'view_project' },
    ]},
  ]
}

function approvalBlocks(data: any, portalUrl: string) {
  const actions: any[] = [
    { type: 'button', text: { type: 'plain_text', text: 'Review in Portal' }, url: `${portalUrl}/#project/${data.project_id}`, action_id: 'review_approval' },
  ]
  if (data.preview_url) {
    actions.push({ type: 'button', text: { type: 'plain_text', text: 'Preview' }, url: data.preview_url, action_id: 'preview' })
  }
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `📋 *Approval requested*\n*${data.title}*` } },
    { type: 'context', elements: [
      { type: 'mrkdwn', text: `Client: *${data.client_name}* · By: *${data.submitted_by || 'Team'}* · Category: *${(data.category || '').replace(/_/g, ' ')}*` },
    ]},
    { type: 'actions', elements: actions },
  ]
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const token = Deno.env.get('SLACK_BOT_TOKEN')
    const portalUrl = Deno.env.get('PORTAL_URL') || 'https://ops.llgportal.com'
    const firehose = 'all-updates'

    if (!token) {
      return new Response(JSON.stringify({ error: 'SLACK_BOT_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = await req.json()
    const { event_type, data } = payload
    console.log(`Slack outbound: ${event_type}`, JSON.stringify(data).substring(0, 300))

    switch (event_type) {

      // ── Task status changed ─────────────────────────────────────────
      case 'task_status_changed': {
        const deptChannel = getDeptChannel(data.department)
        const text = `Task "${data.task_title}" → ${data.new_status} (${data.project_name})`
        const blocks = taskStatusBlocks(data, portalUrl)

        // Post to department channel + firehose
        await postToMultiple([deptChannel, firehose], text, blocks, token)

        // If escalated, also alert
        if (data.new_status === 'escalated') {
          const alertBlocks = escalationBlocks(data, portalUrl)
          await postToMultiple(['sla-alerts', deptChannel, firehose], `🚨 ESCALATED: ${data.task_title}`, alertBlocks, token)

          // DM the assignee
          if (data.assignee_email) {
            await sendDM(data.assignee_email, `🚨 Your task has been escalated: ${data.task_title}`, alertBlocks, token)
          }
        }

        // DM assignee for important status changes
        if (data.assignee_email && ['waiting_on_client', 'ready_for_qa', 'manager_review'].includes(data.new_status)) {
          await sendDM(data.assignee_email, text, blocks, token)
        }
        break
      }

      // ── Task escalated (separate trigger) ─────────────────────────────
      case 'task_escalated': {
        const deptChannel = getDeptChannel(data.department)
        const text = `🚨 ESCALATED: ${data.task_title} (${data.project_name})`
        const blocks = escalationBlocks(data, portalUrl)

        await postToMultiple(['sla-alerts', deptChannel, firehose], text, blocks, token)

        if (data.assignee_email) {
          await sendDM(data.assignee_email, text, blocks, token)
        }
        break
      }

      // ── New ticket ────────────────────────────────────────────────────
      case 'new_ticket': {
        const text = `New ticket: "${data.title}" from ${data.client_name}`
        const blocks = ticketBlocks(data, portalUrl)

        // Route to #client-tickets + firehose
        // Also route to the department of the assigned person if known
        const channels = ['client-tickets', firehose]
        if (data.assigned_department) channels.push(getDeptChannel(data.assigned_department))

        await postToMultiple(channels, text, blocks, token)

        // DM the assigned person
        if (data.assigned_email) {
          await sendDM(data.assigned_email, text, blocks, token)
        }
        break
      }

      // ── Launch stage changed ──────────────────────────────────────────
      case 'launch_stage_changed': {
        const text = `${data.project_name} → ${(data.new_stage || '').replace(/_/g, ' ')}`
        const blocks = launchStageBlocks(data, portalUrl)

        // Route to #launch-calendar + firehose
        // Also notify the department that's now responsible
        const stageToDeptt: Record<string, string> = {
          intake_admin: 'intakes', setup_config: 'dev', design: 'design',
          development: 'dev', internal_qa: 'seo', client_review: 'admin',
          launch_scheduled: 'admin',
        }
        const stageDept = stageToDeptt[data.new_stage] || null
        const channels = ['launch-calendar', firehose]
        if (stageDept) channels.push(stageDept)

        await postToMultiple(channels, text, blocks, token)
        break
      }

      // ── Approval requested ────────────────────────────────────────────
      case 'approval_requested': {
        const text = `Approval needed: "${data.title}" for ${data.client_name}`
        const blocks = approvalBlocks(data, portalUrl)

        await postToMultiple(['approvals', firehose], text, blocks, token)

        // DM the client contact if they have Slack
        if (data.client_email) {
          await sendDM(data.client_email, text, blocks, token)
        }
        break
      }

      default:
        console.log('Unknown event type:', event_type)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Slack outbound error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})