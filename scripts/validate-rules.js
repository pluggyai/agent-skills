#!/usr/bin/env node

/**
 * Validation script to check rule file structure and frontmatter
 * 
 * Validates:
 * - Required frontmatter fields
 * - Valid impact levels
 * - File naming consistency
 * - Code block syntax
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const VALID_IMPACTS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const REQUIRED_FIELDS = ['title', 'impact'];
const OPTIONAL_FIELDS = ['impactDescription', 'tags', 'category', 'relatedRules'];

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { error: 'No frontmatter found', frontmatter: {}, content };
  }
  
  const frontmatterText = match[1];
  const body = match[2].trim();
  
  const frontmatter = {};
  const errors = [];
  
  frontmatterText.split('\n').forEach((line, index) => {
    if (!line.trim()) return;
    
    const colonIndex = line.indexOf(':');
    if (colonIndex <= 0) {
      errors.push(`Line ${index + 1}: Invalid frontmatter format`);
      return;
    }
    
    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Handle array values
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
    }
    
    frontmatter[key] = value;
  });
  
  return { frontmatter, content: body, errors };
}

/**
 * Validate a single rule file
 */
function validateRuleFile(filePath) {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors = [];
  const warnings = [];
  
  // Check file naming (should be kebab-case)
  if (!/^[a-z0-9-]+\.md$/.test(fileName)) {
    warnings.push(`File name should be kebab-case: ${fileName}`);
  }
  
  // Parse frontmatter
  const { frontmatter, content: body, errors: parseErrors } = parseFrontmatter(content);
  errors.push(...parseErrors);
  
  // Check required fields
  REQUIRED_FIELDS.forEach(field => {
    if (!frontmatter[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Validate impact
  if (frontmatter.impact && !VALID_IMPACTS.includes(frontmatter.impact)) {
    errors.push(`Invalid impact level: ${frontmatter.impact}. Must be one of: ${VALID_IMPACTS.join(', ')}`);
  }
  
  // Check tags format
  if (frontmatter.tags) {
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : 
                 (typeof frontmatter.tags === 'string' ? frontmatter.tags.split(',').map(t => t.trim()) : []);
    if (tags.length === 0) {
      warnings.push('Tags field is empty');
    }
  } else {
    warnings.push('No tags specified (recommended for discoverability)');
  }
  
  // Check for impactDescription
  if (!frontmatter.impactDescription) {
    warnings.push('No impactDescription provided (recommended)');
  }
  
  // Validate content structure
  if (!body.trim()) {
    errors.push('Rule content is empty');
  }
  
  // Check for main heading
  if (!body.match(/^##\s+/m)) {
    warnings.push('No main heading (##) found in content');
  }
  
  // Check for code examples
  const codeBlocks = (body.match(/```/g) || []).length;
  if (codeBlocks < 2) {
    warnings.push('Few code examples found (recommend at least one incorrect and one correct example)');
  }
  
  // Check for "Incorrect" and "Correct" patterns
  const hasIncorrect = /incorrect|wrong|don't|never/i.test(body);
  const hasCorrect = /correct|right|do|should/i.test(body);
  
  if (!hasIncorrect && !hasCorrect) {
    warnings.push('No clear incorrect/correct pattern found (recommended format)');
  }
  
  // Check for references
  if (!body.match(/Reference:|See also:/i)) {
    warnings.push('No reference link found (recommended)');
  }
  
  return {
    filePath,
    fileName,
    errors,
    warnings,
    frontmatter,
  };
}

/**
 * Main validation function
 */
function main() {
  console.log('Validating rule files...\n');
  
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }
  
  const skillDirs = fs.readdirSync(SKILLS_DIR)
    .map(name => path.join(SKILLS_DIR, name))
    .filter(dir => fs.statSync(dir).isDirectory());
  
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalFiles = 0;
  
  skillDirs.forEach(skillDir => {
    const skillName = path.basename(skillDir);
    const rulesDir = path.join(skillDir, 'rules');
    
    if (!fs.existsSync(rulesDir)) {
      console.warn(`⚠️  ${skillName}: No rules directory`);
      return;
    }
    
    const ruleFiles = fs.readdirSync(rulesDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(rulesDir, file));
    
    if (ruleFiles.length === 0) {
      console.warn(`⚠️  ${skillName}: No rule files found`);
      return;
    }
    
    console.log(`\n📁 ${skillName} (${ruleFiles.length} rules)`);
    
    ruleFiles.forEach(filePath => {
      totalFiles++;
      const result = validateRuleFile(filePath);
      const fileName = path.basename(filePath);
      
      if (result.errors.length > 0) {
        console.error(`  ❌ ${fileName}`);
        result.errors.forEach(error => {
          console.error(`     - ${error}`);
          totalErrors++;
        });
      } else if (result.warnings.length > 0) {
        console.warn(`  ⚠️  ${fileName}`);
        result.warnings.forEach(warning => {
          console.warn(`     - ${warning}`);
          totalWarnings++;
        });
      } else {
        console.log(`  ✅ ${fileName}`);
      }
    });
  });
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total files: ${totalFiles}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Warnings: ${totalWarnings}`);
  
  if (totalErrors > 0) {
    console.error(`\n❌ Validation failed with ${totalErrors} error(s)`);
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.warn(`\n⚠️  Validation passed with ${totalWarnings} warning(s)`);
    process.exit(0);
  } else {
    console.log(`\n✅ All rules validated successfully!`);
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateRuleFile, parseFrontmatter };
