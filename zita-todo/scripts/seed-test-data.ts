/**
 * Seed script pre naplnenie databázy testovacími dátami
 *
 * Spustenie: npx tsx scripts/seed-test-data.ts
 *
 * Vyžaduje: SUPABASE_SERVICE_ROLE_KEY v .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ============================================
// KONFIGURÁCIA
// ============================================

const PROJECTS_PER_AREA: Record<string, string[]> = {
  'Prevádzka': ['Optimalizácia procesov', 'Zákaznícka podpora 2.0'],
  'Rámy': ['Nová produktová rada', 'Sklad a logistika'],
  'Financie': ['Q1 Reporting', 'Automatizácia fakturácie'],
  'Marketing': ['Brand refresh', 'Social media kampaň'],
  'Newbiz': ['CRM implementácia', 'Lead generation'],
  'Inovácie': ['R&D prototyp', 'Digitálna transformácia'],
}

const TAGS = [
  { name: 'Urgent', color: '#ef4444' },
  { name: 'Review', color: '#8b5cf6' },
  { name: 'Čaká na odpoveď', color: '#f97316' },
  { name: 'Interné', color: '#6b7280' },
  { name: 'Klient', color: '#3b82f6' },
  { name: 'Meeting', color: '#22c55e' },
]

const TASK_TITLES: Record<string, string[]> = {
  'Prevádzka': [
    'Aktualizovať SOP dokumentáciu',
    'Riešiť reklamáciu #4521',
    'Školenie nových zamestnancov',
    'Inventúra skladu',
    'Optimalizovať dodacie lehoty',
    'Pripraviť report pre manažment',
    'Revízia pracovných postupov',
    'Kontrola bezpečnosti pracoviska',
    'Aktualizácia BOZP dokumentov',
    'Plánovanie smien na Q2',
  ],
  'Rámy': [
    'Objednať materiál od dodávateľa',
    'Kontrola kvality novej série',
    'Aktualizovať cenník',
    'Fotenie produktov pre e-shop',
    'Návrh nového dizajnu rámu',
    'Testovanie nových materiálov',
    'Katalógové listy produktov',
    'Vzorky pre VIP klientov',
    'Certifikácia nových produktov',
    'Porovnanie dodávateľov',
  ],
  'Financie': [
    'Spracovať faktúry za január',
    'Pripraviť cashflow prognózu',
    'Kontrola nákladov Q1',
    'Daňové priznanie príprava',
    'Aktualizovať účtovný systém',
    'Analýza marží produktov',
    'Rozpočet na nasledujúci rok',
    'Audit interných procesov',
    'Kontrola pohľadávok',
    'Report pre investorov',
  ],
  'Marketing': [
    'Naplánovať obsahový kalendár',
    'Vytvoriť newsletter',
    'Analyzovať metriky kampaní',
    'Redizajn landing page',
    'Pripraviť podklady pre PR',
    'Social media reporting',
    'SEO optimalizácia webu',
    'Príprava reklamných bannerov',
    'Influencer spolupráca',
    'Súťaž na Instagrame',
  ],
  'Newbiz': [
    'Follow-up s potenciálnym klientom',
    'Pripraviť cenovú ponuku',
    'Aktualizovať CRM databázu',
    'Cold calling - zoznam 50 kontaktov',
    'Prezentácia pre investora',
    'Analýza konkurencie',
    'Pitch deck aktualizácia',
    'Networking event príprava',
    'Demo pre enterprise klienta',
    'Partnerský program návrh',
  ],
  'Inovácie': [
    'Výskum nových technológií',
    'Prototyp MVP funkcie',
    'User testing session',
    'Dokumentácia API',
    'Brainstorming nových funkcií',
    'Analýza trhu',
    'POC integrácie s AI',
    'UX research rozhovory',
    'Benchmark konkurencie',
    'Technická špecifikácia',
  ],
}

const NOTES = [
  'Potrebné dokončiť do konca týždňa.',
  'Čaká sa na odpoveď od klienta.',
  'Rozpracované, pokračovať zajtra.',
  'Vysoká priorita od vedenia.',
  'Konzultovať s tímom pred dokončením.',
  'Deadline posunutý o týždeň.',
  'Potrebná revízia pred odoslaním.',
  'Závisí na dokončení predchádzajúcej úlohy.',
  'Schválené manažmentom.',
  'Testovacia fáza ukončená úspešne.',
]

const CHECKLIST_ITEMS = [
  ['Pripraviť podklady', 'Skontrolovať údaje', 'Odoslať na schválenie'],
  ['Prvý krok', 'Druhý krok', 'Tretí krok', 'Záverečná kontrola'],
  ['Analýza', 'Návrh', 'Implementácia', 'Testovanie', 'Nasadenie'],
  ['Zber požiadaviek', 'Špecifikácia', 'Realizácia'],
  ['Konzultácia', 'Príprava', 'Prezentácia', 'Follow-up'],
]

// ============================================
// POMOCNÉ FUNKCIE
// ============================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomChoices<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function randomDate(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

function randomPastDate(maxDaysAgo: number): string {
  const daysAgo = randomInt(1, maxDaysAgo)
  return randomDate(-daysAgo)
}

function weightedRandom<T>(options: { value: T; weight: number }[]): T {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0)
  let random = Math.random() * totalWeight

  for (const option of options) {
    random -= option.weight
    if (random <= 0) {
      return option.value
    }
  }

  return options[options.length - 1].value
}

// ============================================
// SEED FUNKCIE
// ============================================

async function getUser() {
  const { data, error } = await supabase
    .from('users')
    .select('id, organization_id')
    .limit(1)
    .single()

  if (error || !data) {
    console.error('Error fetching user:', error)
    throw new Error('No user found')
  }

  return data
}

async function getAreas() {
  const { data, error } = await supabase
    .from('areas')
    .select('id, name')
    .is('archived_at', null)
    .order('name')

  if (error) {
    console.error('Error fetching areas:', error)
    throw error
  }

  return data || []
}

async function createTags(userId: string, organizationId: string | null) {
  console.log('Creating tags...')

  const tagsToInsert = TAGS.map(tag => ({
    name: tag.name,
    color: tag.color,
    organization_id: organizationId,
  }))

  const { data, error } = await supabase
    .from('tags')
    .upsert(tagsToInsert, { onConflict: 'name' })
    .select()

  if (error) {
    console.error('Error creating tags:', error)
    // Ak upsert nefunguje, skúsime select existujúcich
    const { data: existingTags } = await supabase
      .from('tags')
      .select('*')
    return existingTags || []
  }

  console.log(`Created ${data?.length || 0} tags`)
  return data || []
}

async function createProjects(areas: { id: string; name: string }[], userId: string, organizationId: string | null) {
  console.log('Creating projects...')

  const projectsToInsert: any[] = []

  for (const area of areas) {
    const projectNames = PROJECTS_PER_AREA[area.name]
    if (!projectNames) continue

    for (const projectName of projectNames) {
      projectsToInsert.push({
        name: projectName,
        area_id: area.id,
        owner_id: userId,
        organization_id: organizationId,
        status: 'active',
        color: randomChoice(['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6']),
      })
    }
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(projectsToInsert)
    .select()

  if (error) {
    console.error('Error creating projects:', error)
    throw error
  }

  console.log(`Created ${data?.length || 0} projects`)
  return data || []
}

async function createTasks(
  areas: { id: string; name: string }[],
  projects: { id: string; name: string; area_id: string }[],
  tags: { id: string; name: string }[],
  userId: string,
  organizationId: string | null
) {
  console.log('Creating tasks...')

  const tasksToInsert: any[] = []
  const areaMap = new Map(areas.map(a => [a.id, a.name]))

  // Úlohy pre projekty (5-20 na projekt)
  for (const project of projects) {
    const areaName = areaMap.get(project.area_id) || 'Prevádzka'
    const taskTitles = TASK_TITLES[areaName] || TASK_TITLES['Prevádzka']
    const taskCount = randomInt(5, 20)

    for (let i = 0; i < taskCount; i++) {
      tasksToInsert.push(generateTask(
        randomChoice(taskTitles) + ` (${i + 1})`,
        project.area_id,
        project.id,
        userId,
        organizationId
      ))
    }
  }

  // Voľné úlohy na oddelenie (5-10 na oddelenie)
  for (const area of areas) {
    const taskTitles = TASK_TITLES[area.name] || TASK_TITLES['Prevádzka']
    const taskCount = randomInt(5, 10)

    for (let i = 0; i < taskCount; i++) {
      tasksToInsert.push(generateTask(
        randomChoice(taskTitles) + ' - voľná úloha',
        area.id,
        null,
        userId,
        organizationId
      ))
    }
  }

  console.log(`Inserting ${tasksToInsert.length} tasks...`)

  // Insert po dávkach (50 taskov naraz)
  const BATCH_SIZE = 50
  const allTasks: any[] = []

  for (let i = 0; i < tasksToInsert.length; i += BATCH_SIZE) {
    const batch = tasksToInsert.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase
      .from('tasks')
      .insert(batch)
      .select()

    if (error) {
      console.error('Error creating tasks batch:', error)
      throw error
    }

    allTasks.push(...(data || []))
    console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tasksToInsert.length / BATCH_SIZE)}`)
  }

  console.log(`Created ${allTasks.length} tasks`)
  return allTasks
}

function generateTask(
  title: string,
  areaId: string,
  projectId: string | null,
  userId: string,
  organizationId: string | null
): any {
  // When type distribution: 20% today, 25% scheduled, 30% anytime, 15% someday, 10% inbox
  const whenType = weightedRandom([
    { value: 'today', weight: 20 },
    { value: 'scheduled', weight: 25 },
    { value: 'anytime', weight: 30 },
    { value: 'someday', weight: 15 },
    { value: 'inbox', weight: 10 },
  ])

  // Status distribution: 20% backlog, 25% todo, 25% in_progress, 15% review, 15% done
  const status = weightedRandom([
    { value: 'backlog', weight: 20 },
    { value: 'todo', weight: 25 },
    { value: 'in_progress', weight: 25 },
    { value: 'review', weight: 15 },
    { value: 'done', weight: 15 },
  ])

  // Priority distribution: 40% null, 25% low, 20% medium, 10% high, 5% urgent
  const priority = weightedRandom([
    { value: null, weight: 40 },
    { value: 'low', weight: 25 },
    { value: 'medium', weight: 20 },
    { value: 'high', weight: 10 },
    { value: 'urgent', weight: 5 },
  ])

  // Deadline distribution: 30% null, 10% overdue, 15% today, 20% this week, 25% next month
  let deadline: string | null = null
  const deadlineType = weightedRandom([
    { value: 'none', weight: 30 },
    { value: 'overdue', weight: 10 },
    { value: 'today', weight: 15 },
    { value: 'week', weight: 20 },
    { value: 'month', weight: 25 },
  ])

  switch (deadlineType) {
    case 'overdue':
      deadline = randomPastDate(7)
      break
    case 'today':
      deadline = randomDate(0)
      break
    case 'week':
      deadline = randomDate(randomInt(1, 7))
      break
    case 'month':
      deadline = randomDate(randomInt(8, 30))
      break
  }

  // Notes: 70% without, 30% with
  const notes = Math.random() < 0.3 ? randomChoice(NOTES) : null

  // Checklist: 80% without, 20% with
  let checklistItems: any[] = []
  if (Math.random() < 0.2) {
    const items = randomChoice(CHECKLIST_ITEMS)
    checklistItems = items.map((text, index) => ({
      id: `item-${Date.now()}-${index}`,
      text,
      completed: Math.random() < 0.4, // 40% chance each item is completed
    }))
  }

  // When date for scheduled tasks
  let whenDate: string | null = null
  if (whenType === 'scheduled') {
    whenDate = randomDate(randomInt(1, 30))
  }

  // Completed at for done tasks
  let completedAt: string | null = null
  if (status === 'done') {
    const daysAgo = randomInt(0, 14)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    completedAt = date.toISOString()
  }

  // Created at - random in last 30 days
  const createdDaysAgo = randomInt(0, 30)
  const createdAt = new Date()
  createdAt.setDate(createdAt.getDate() - createdDaysAgo)

  return {
    title,
    notes,
    area_id: areaId,
    project_id: projectId,
    user_id: userId,
    organization_id: organizationId,
    assignee_id: userId,
    when_type: whenType,
    when_date: whenDate,
    deadline,
    status,
    priority,
    is_inbox: whenType === 'inbox',
    checklist_items: checklistItems,
    completed_at: completedAt,
    created_at: createdAt.toISOString(),
    created_by: userId,
  }
}

async function createTaskTags(
  tasks: { id: string }[],
  tags: { id: string }[]
) {
  console.log('Creating task tags...')

  const taskTagsToInsert: { task_id: string; tag_id: string }[] = []

  for (const task of tasks) {
    // Tags distribution: 50% none, 30% one tag, 20% 2+ tags
    const tagCount = weightedRandom([
      { value: 0, weight: 50 },
      { value: 1, weight: 30 },
      { value: 2, weight: 15 },
      { value: 3, weight: 5 },
    ])

    if (tagCount > 0 && tags.length > 0) {
      const selectedTags = randomChoices(tags, Math.min(tagCount, tags.length))
      for (const tag of selectedTags) {
        taskTagsToInsert.push({
          task_id: task.id,
          tag_id: tag.id,
        })
      }
    }
  }

  if (taskTagsToInsert.length > 0) {
    const { error } = await supabase
      .from('task_tags')
      .insert(taskTagsToInsert)

    if (error) {
      console.error('Error creating task tags:', error)
      // Continue anyway, tags are optional
    }
  }

  console.log(`Created ${taskTagsToInsert.length} task-tag relations`)
}

async function createTimeEntries(
  tasks: { id: string; project_id: string | null; area_id: string | null }[],
  userId: string,
  organizationId: string | null
) {
  console.log('Creating time entries...')

  const timeEntriesToInsert: any[] = []

  // 40% of tasks have time entries
  const tasksWithTime = tasks.filter(() => Math.random() < 0.4)

  for (const task of tasksWithTime) {
    // 1-3 time entries per task
    const entryCount = randomInt(1, 3)

    for (let i = 0; i < entryCount; i++) {
      // Duration: 5 min to 4 hours (in seconds)
      const durationSeconds = randomInt(5 * 60, 4 * 60 * 60)

      // Started at: random time in last 14 days
      const daysAgo = randomInt(0, 14)
      const hoursAgo = randomInt(0, 23)
      const startedAt = new Date()
      startedAt.setDate(startedAt.getDate() - daysAgo)
      startedAt.setHours(startedAt.getHours() - hoursAgo)

      const stoppedAt = new Date(startedAt.getTime() + durationSeconds * 1000)

      timeEntriesToInsert.push({
        user_id: userId,
        task_id: task.id,
        project_id: task.project_id,
        area_id: task.area_id,
        organization_id: organizationId,
        started_at: startedAt.toISOString(),
        ended_at: stoppedAt.toISOString(),
        duration_seconds: durationSeconds,
        is_running: false,
      })
    }
  }

  if (timeEntriesToInsert.length > 0) {
    // Insert in batches
    const BATCH_SIZE = 50
    for (let i = 0; i < timeEntriesToInsert.length; i += BATCH_SIZE) {
      const batch = timeEntriesToInsert.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('time_entries')
        .insert(batch)

      if (error) {
        console.error('Error creating time entries batch:', error)
        // Continue with next batch
      }
    }
  }

  console.log(`Created ${timeEntriesToInsert.length} time entries`)
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(50))
  console.log('ZITA TODO - Seed Test Data')
  console.log('='.repeat(50))

  try {
    // 1. Get user
    console.log('\n1. Getting user...')
    const user = await getUser()
    console.log(`   User ID: ${user.id}`)
    console.log(`   Organization ID: ${user.organization_id}`)

    // 2. Get existing areas
    console.log('\n2. Getting existing areas...')
    const areas = await getAreas()
    console.log(`   Found ${areas.length} areas:`)
    areas.forEach(a => console.log(`   - ${a.name}`))

    if (areas.length === 0) {
      console.error('No areas found! Please create areas first.')
      process.exit(1)
    }

    // 3. Create tags
    console.log('\n3. Creating tags...')
    const tags = await createTags(user.id, user.organization_id)
    console.log(`   Tags: ${tags.map(t => t.name).join(', ')}`)

    // 4. Create projects
    console.log('\n4. Creating projects...')
    const projects = await createProjects(areas, user.id, user.organization_id)
    console.log(`   Projects: ${projects.map(p => p.name).join(', ')}`)

    // 5. Create tasks
    console.log('\n5. Creating tasks...')
    const tasks = await createTasks(areas, projects, tags, user.id, user.organization_id)

    // 6. Create task-tag relations
    console.log('\n6. Creating task-tag relations...')
    await createTaskTags(tasks, tags)

    // 7. Create time entries
    console.log('\n7. Creating time entries...')
    await createTimeEntries(tasks, user.id, user.organization_id)

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('SEED COMPLETE!')
    console.log('='.repeat(50))
    console.log(`Areas:        ${areas.length}`)
    console.log(`Projects:     ${projects.length}`)
    console.log(`Tags:         ${tags.length}`)
    console.log(`Tasks:        ${tasks.length}`)
    console.log('='.repeat(50))

  } catch (error) {
    console.error('\nSeed failed:', error)
    process.exit(1)
  }
}

main()
