#!/usr/bin/env node

/**
 * Build script to auto-generate AGENTS.md files from rule files
 * 
 * This script:
 * 1. Scans each skill directory for rule files
 * 2. Parses frontmatter and content
 * 3. Generates AGENTS.md with all rules compiled
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');

// Impact order for sorting
const IMPACT_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, content: content.trim() };
  }
  
  const frontmatterText = match[1];
  const body = match[2].trim();
  
  const frontmatter = {};
  frontmatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Handle array values (tags)
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
      }
      
      frontmatter[key] = value;
    }
  });
  
  return { frontmatter, content: body };
}

/**
 * Extract the main heading and first section from rule content
 */
function extractRuleSummary(content) {
  // Get the first heading (should be the rule title)
  const headingMatch = content.match(/^##\s+(.+)$/m);
  const title = headingMatch ? headingMatch[1] : '';
  
  // Get first paragraph after title
  const paragraphs = content.split('\n\n').filter(p => p.trim() && !p.startsWith('#'));
  const summary = paragraphs[0] || '';
  
  return { title, summary };
}

/**
 * Process all rule files in a skill directory
 */
function processSkill(skillDir) {
  const skillName = path.basename(skillDir);
  const rulesDir = path.join(skillDir, 'rules');
  const metadataPath = path.join(skillDir, 'metadata.json');
  
  if (!fs.existsSync(rulesDir)) {
    console.warn(`No rules directory found for ${skillName}`);
    return null;
  }
  
  // Read metadata
  let metadata = {};
  if (fs.existsSync(metadataPath)) {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  }
  
  // Read all rule files
  const ruleFiles = fs.readdirSync(rulesDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(rulesDir, file));
  
  const rules = ruleFiles.map(filePath => {
    const fileName = path.basename(filePath, '.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, content: body } = parseFrontmatter(content);
    const { title, summary } = extractRuleSummary(body);
    
    return {
      fileName,
      filePath,
      title: frontmatter.title || title,
      impact: frontmatter.impact || 'MEDIUM',
      impactDescription: frontmatter.impactDescription || '',
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : 
            (frontmatter.tags ? frontmatter.tags.split(',').map(t => t.trim()) : []),
      content: body,
      summary,
    };
  });
  
  // Sort by impact, then by title
  rules.sort((a, b) => {
    const impactDiff = IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact];
    if (impactDiff !== 0) return impactDiff;
    return a.title.localeCompare(b.title);
  });
  
  return { skillName, metadata, rules };
}

/**
 * Generate AGENTS.md content
 */
function generateAgentsMD(skillData) {
  const { skillName, metadata, rules } = skillData;
  
  // Get skill description from metadata or default
  const description = metadata.description || 
    `Complete guide for ${skillName.replace(/-/g, ' ')}`;
  
  let output = `# ${skillName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - Complete Guide\n\n`;
  output += `This document contains all rules for ${description.toLowerCase()}.\n\n`;
  output += `> **Generated:** ${new Date().toISOString().split('T')[0]}\n`;
  output += `> **Total Rules:** ${rules.length}\n\n`;
  
  // Group by impact
  const byImpact = {
    CRITICAL: rules.filter(r => r.impact === 'CRITICAL'),
    HIGH: rules.filter(r => r.impact === 'HIGH'),
    MEDIUM: rules.filter(r => r.impact === 'MEDIUM'),
    LOW: rules.filter(r => r.impact === 'LOW'),
  };
  
  // Table of contents
  output += `## Table of Contents\n\n`;
  Object.entries(byImpact).forEach(([impact, impactRules]) => {
    if (impactRules.length > 0) {
      output += `### ${impact}\n\n`;
      impactRules.forEach(rule => {
        const anchor = rule.title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        output += `- [${rule.title}](#${anchor})\n`;
      });
      output += `\n`;
    }
  });
  
  output += `---\n\n`;
  
  // Rules by impact
  Object.entries(byImpact).forEach(([impact, impactRules]) => {
    if (impactRules.length === 0) return;
    
    output += `## ${impact} Rules\n\n`;
    
    impactRules.forEach((rule, index) => {
      if (index > 0) output += `\n---\n\n`;
      
      output += `### ${rule.title}\n\n`;
      output += `**Impact:** ${impact}\n\n`;
      
      if (rule.impactDescription) {
        output += `${rule.impactDescription}\n\n`;
      }
      
      // Add the rule content (skip the first heading since we already have it)
      let ruleContent = rule.content;
      // Remove the first ## heading if it matches the title
      ruleContent = ruleContent.replace(/^##\s+.*$/m, '');
      output += ruleContent.trim();
      output += `\n\n`;
    });
  });
  
  // Quick reference
  output += `---\n\n`;
  output += `## Quick Reference\n\n`;
  output += `| Rule | Impact | Tags |\n`;
  output += `| ---- | ------ | ---- |\n`;
  rules.forEach(rule => {
    const tags = rule.tags.join(', ') || '-';
    output += `| ${rule.title} | ${rule.impact} | ${tags} |\n`;
  });
  
  return output;
}

/**
 * Main function
 */
function main() {
  console.log('Building AGENTS.md files...\n');
  
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }
  
  const skillDirs = fs.readdirSync(SKILLS_DIR)
    .map(name => path.join(SKILLS_DIR, name))
    .filter(dir => fs.statSync(dir).isDirectory());
  
  let successCount = 0;
  let errorCount = 0;
  
  skillDirs.forEach(skillDir => {
    try {
      const skillData = processSkill(skillDir);
      if (!skillData) {
        console.warn(`Skipping ${path.basename(skillDir)}`);
        return;
      }
      
      const agentsMD = generateAgentsMD(skillData);
      const outputPath = path.join(skillDir, 'AGENTS.md');
      
      fs.writeFileSync(outputPath, agentsMD, 'utf-8');
      console.log(`✅ Generated ${skillData.skillName}/AGENTS.md (${skillData.rules.length} rules)`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error processing ${path.basename(skillDir)}:`, error.message);
      errorCount++;
    }
  });
  
  console.log(`\n✅ Success: ${successCount}`);
  if (errorCount > 0) {
    console.error(`❌ Errors: ${errorCount}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { processSkill, generateAgentsMD, parseFrontmatter };
