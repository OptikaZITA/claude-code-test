/**
 * Import Trello data from "NATY x ZITA" board into ZITA TODO
 *
 * Usage: npm run import:trello-naty
 *
 * Requirements:
 * - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars in .env.local
 * - JSON file: dTOak58K - naty-x-zita (1).json
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Types for Trello data
interface TrelloCard {
  id: string
  name: string
  idList: string
  desc: string
  due: string | null
  idLabels: string[]
  closed: boolean
}

interface TrelloChecklist {
  id: string
  idCard: string
  name: string
  checkItems: {
    id: string
    name: string
    state: 'complete' | 'incomplete'
  }[]
}

interface TrelloData {
  cards: TrelloCard[]
  checklists: TrelloChecklist[]
  labels: {
    id: string
    name: string
    color: string
  }[]
  lists: {
    id: string
    name: string
    closed: boolean
  }[]
}

// Configuration
const TAG_COLORS: Record<string, string> = {
  'TREBA RIEŠIŤ': '#3B82F6',    // blue
  'RIEŠIM': '#8B5CF6',          // purple
  'PRE ZÁKAZNÍKA': '#EC4899',   // pink
  'ČAKÁM NA DORUČENIE': '#22C55E', // green
  'ČAKÁM NA DODÁVATEĽA': '#EAB308', // yellow
  'ČAKÁM NA ZÁKAZNÍKA': '#84CC16', // lime
  'PREDAJNÝ RÁM': '#0EA5E9',    // sky
  'PRE ZAMESTNANCA': '#84CC16', // lime
  'OPAKUJÚCI TASK': '#EC4899',  // pink
  'URGENT': '#EF4444',          // red
  'UKONČENÉ': '#22C55E',        // green
  'OFFICE': '#6B7280',          // gray
}

// Trello List ID -> ZITA Project mapping
const PROJECT_LISTS: Record<string, string> = {
  '692ff7777ae88eb28b0fa382': 'Objednávky rámov',    // #objednávky rámov
  '692ff7777ae88eb28b0fa383': 'Reklamácie',          // #reklamácie
  '6930597936122eedc78e6736': 'Sľuby zákazníkom',    // #sluby zákazníkom
  '695f6d9d9777a771a3aa9579': 'Vratky',              // VRATKY
}

// Special lists (inbox tasks with special tags)
const INBOX_LISTS: Record<string, string> = {
  '6979fa41725fc5143e5babe4': 'URGENT',  // !!! list
  '6970e476b76f7fdb9c148f6b': 'OFFICE',  // OFFICE list
}

// Trello Label ID -> ZITA Tag title
const LABEL_TO_TAG: Record<string, string> = {
  '692ff7777ae88eb28b0fa379': 'TREBA RIEŠIŤ',
  '692ff7777ae88eb28b0fa37c': 'RIEŠIM',
  '692ff7777ae88eb28b0fa37b': 'PRE ZÁKAZNÍKA',
  '6983862edb5d2ff640759414': 'ČAKÁM NA DORUČENIE',
  '696a044c9417c6cee3c36819': 'ČAKÁM NA DODÁVATEĽA',
  '696a04735f17971b2b4aea2e': 'ČAKÁM NA ZÁKAZNÍKA',
  '692ff7777ae88eb28b0fa37d': 'PREDAJNÝ RÁM',
  '696919162f645deafefcd32a': 'PRE ZAMESTNANCA',
  '6970ea546f9b98a4c4cdf6f8': 'OPAKUJÚCI TASK',
  '692ff7777ae88eb28b0fa37a': 'URGENT',
  '692ff7777ae88eb28b0fa378': 'UKONČENÉ',
}

// Lists to skip (Trello starter guide, closed lists, etc.)
const LISTS_TO_SKIP = new Set([
  '692ff7777ae88eb28b0fa381', // Trello Starter Guide
  '692ff7777ae88eb28b0fa384', // Later (closed)
  '693717a8bd844c1d5cf8fa2e', // Objednávky na ceste (closed)
  '693717e12bb26cf6bfe9744c', // Neuhradené faktúry (closed)
  '6937dfa1ec13def6e71950df', // Theo (closed)
  '6937d89869bcb9d64a265e52', // Maryll (closed)
  '6937d8a1179f93dddbf2895c', // Ross&Brown (closed)
  '6937d8a5ee5ec1d8437c9208', // Albert Imstein (closed)
  '693ab09c266fe20012a57c67', // GASTON (closed)
  '6970e76008bcbc10bc3eb561', // RÁMY (closed)
  '6970e75cad5c0da56e17baa7', // PREVÁDZKA (closed)
])

async function main() {
  console.log('🚀 Starting Trello import for NATY...\n')

  // Initialize Supabase admin client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Load Trello JSON
  const jsonPath = path.join(process.cwd(), 'dTOak58K - naty-x-zita (1).json')
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON file not found: ${jsonPath}`)
    process.exit(1)
  }

  const trelloData: TrelloData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  console.log(`📁 Loaded Trello data: ${trelloData.cards.length} cards, ${trelloData.checklists.length} checklists\n`)

  // Step 1: Find NATY user
  console.log('👤 Finding NATY user...')
  const { data: natyUser, error: natyError } = await supabase
    .from('users')
    .select('id, organization_id, full_name, nickname')
    .or('nickname.ilike.%naty%,full_name.ilike.%naty%')
    .single()

  if (natyError || !natyUser) {
    console.error('❌ NATY user not found:', natyError)
    process.exit(1)
  }

  console.log(`   ✅ Found: ${natyUser.nickname || natyUser.full_name} (ID: ${natyUser.id})`)
  const userId = natyUser.id
  const organizationId = natyUser.organization_id

  // Step 2: Find Area "Rámy"
  console.log('\n📁 Finding Area "Rámy"...')
  const { data: ramyArea, error: areaError } = await supabase
    .from('areas')
    .select('id, name')
    .eq('name', 'Rámy')
    .eq('organization_id', organizationId)
    .single()

  if (areaError || !ramyArea) {
    console.error('❌ Area "Rámy" not found:', areaError)
    process.exit(1)
  }

  console.log(`   ✅ Found: ${ramyArea.name} (ID: ${ramyArea.id})`)
  const areaId = ramyArea.id

  // Step 3: Create tags if they don't exist
  console.log('\n🏷️  Creating tags...')
  const tagMap: Record<string, string> = {}

  for (const [title, color] of Object.entries(TAG_COLORS)) {
    // Check if exists
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('name', title)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (existing) {
      tagMap[title] = existing.id
      console.log(`   ⏭️  Tag "${title}" already exists`)
    } else {
      const { data: newTag, error: tagError } = await supabase
        .from('tags')
        .insert({
          name: title,
          color: color,
          organization_id: organizationId,
        })
        .select('id')
        .single()

      if (tagError) {
        console.error(`   ❌ Error creating tag "${title}":`, tagError)
        continue
      }

      tagMap[title] = newTag.id
      console.log(`   ✅ Created tag "${title}"`)
    }
  }

  // Step 4: Create projects
  console.log('\n📂 Creating projects...')
  const projectMap: Record<string, string> = {}

  for (const [listId, projectTitle] of Object.entries(PROJECT_LISTS)) {
    // Check if project already exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('name', projectTitle)
      .eq('area_id', areaId)
      .maybeSingle()

    if (existing) {
      projectMap[listId] = existing.id
      console.log(`   ⏭️  Project "${projectTitle}" already exists`)
    } else {
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectTitle,
          area_id: areaId,
          owner_id: userId,
          organization_id: organizationId,
          status: 'active',
        })
        .select('id')
        .single()

      if (projectError) {
        console.error(`   ❌ Error creating project "${projectTitle}":`, projectError)
        continue
      }

      projectMap[listId] = newProject.id
      console.log(`   ✅ Created project "${projectTitle}"`)
    }
  }

  // Step 5: Import tasks
  console.log('\n📋 Importing tasks...')
  let importedCount = 0
  let skippedCount = 0

  // Get all relevant cards (not closed, in known lists)
  const relevantCards = trelloData.cards.filter(card => {
    if (card.closed) return false
    if (LISTS_TO_SKIP.has(card.idList)) return false
    return PROJECT_LISTS[card.idList] || INBOX_LISTS[card.idList]
  })

  console.log(`   Found ${relevantCards.length} relevant cards to import`)

  for (const card of relevantCards) {
    const isInboxTask = !!INBOX_LISTS[card.idList]
    const projectId = isInboxTask ? null : projectMap[card.idList]

    // Skip if not in known list
    if (!isInboxTask && !projectId) {
      skippedCount++
      continue
    }

    // Check if task already exists (by title)
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id')
      .eq('title', card.name)
      .eq('assignee_id', userId)
      .maybeSingle()

    if (existingTask) {
      console.log(`   ⏭️  Task "${card.name.substring(0, 40)}..." already exists`)
      skippedCount++
      continue
    }

    // Prepare notes
    let notes = card.desc || ''

    // Map checklists
    const cardChecklists = trelloData.checklists.filter(cl => cl.idCard === card.id)
    const checklistItems = cardChecklists.flatMap(cl =>
      cl.checkItems.map(item => ({
        id: randomUUID(),
        text: item.name,
        completed: item.state === 'complete',
      }))
    )

    // Create task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: card.name,
        notes: notes || null,
        project_id: projectId,
        area_id: isInboxTask ? null : areaId,
        organization_id: organizationId,
        assignee_id: userId,
        created_by: userId,
        status: 'todo',
        when_type: isInboxTask ? 'inbox' : 'anytime',
        is_inbox: isInboxTask,
        deadline: card.due ? card.due.split('T')[0] : null,
        checklist_items: checklistItems.length > 0 ? checklistItems : [],
        source: 'api',
      })
      .select('id')
      .single()

    if (taskError) {
      console.error(`   ❌ Error creating task "${card.name.substring(0, 40)}...":`, taskError)
      continue
    }

    // Assign tags from Trello labels
    const tagIds: string[] = []

    for (const labelId of card.idLabels) {
      const tagTitle = LABEL_TO_TAG[labelId]
      if (tagTitle && tagMap[tagTitle]) {
        tagIds.push(tagMap[tagTitle])
      }
    }

    // Add special tag for inbox tasks
    if (isInboxTask) {
      const specialTagTitle = INBOX_LISTS[card.idList]
      if (specialTagTitle && tagMap[specialTagTitle]) {
        if (!tagIds.includes(tagMap[specialTagTitle])) {
          tagIds.push(tagMap[specialTagTitle])
        }
      }
    }

    // Insert task_tags
    if (tagIds.length > 0) {
      const tagInserts = tagIds.map(tagId => ({
        tag_id: tagId,
        task_id: task.id,
      }))

      const { error: tagLinkError } = await supabase
        .from('task_tags')
        .insert(tagInserts)

      if (tagLinkError) {
        console.error(`   ⚠️  Error linking tags for task "${card.name.substring(0, 40)}...":`, tagLinkError)
      }
    }

    importedCount++
    console.log(`   ✅ Imported: "${card.name.substring(0, 50)}${card.name.length > 50 ? '...' : ''}"`)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(50))
  console.log(`   Tags created/found: ${Object.keys(tagMap).length}`)
  console.log(`   Projects created/found: ${Object.keys(projectMap).length}`)
  console.log(`   Tasks imported: ${importedCount}`)
  console.log(`   Tasks skipped: ${skippedCount}`)
  console.log('\n✅ Import completed!')
}

// Run
main().catch(console.error)
