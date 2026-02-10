// Simple test to check if our foreign key fixes are working
const fs = require('fs');

// Read the files and check for foreign key patterns
const files = [
  'admin-service/src/routes/business-modules.ts',
  'admin-service/src/routes/postal-monitoring.ts',
  'social-service/src/routes/likes.ts',
  'social-service/src/routes/stories.ts',
];

let totalRefs = 0;
let fixedRefs = 0;

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Match foreign key patterns like: table!foreign_key_name(columns)
      const fkMatches = line.match(/(\w+)!(\w+)\(/g);
      if (fkMatches) {
        fkMatches.forEach(match => {
          totalRefs++;
          const [table, fkName] = match.replace('(', '').split('!');

          // Check if it's using proper constraint names (not generic ones)
          if (
            fkName !== 'inner' &&
            fkName !== 'user_id' &&
            fkName !== 'office_id' &&
            fkName !== 'region_id' &&
            fkName !== 'uploaded_by'
          ) {
            fixedRefs++;
            console.log(`✅ ${file}:${index + 1} - ${match}`);
          } else {
            console.log(`❌ ${file}:${index + 1} - ${match} (generic pattern)`);
          }
        });
      }
    });
  } catch (error) {
    console.log(`⚠️  Could not read ${file}: ${error.message}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Total foreign key references: ${totalRefs}`);
console.log(`   Fixed references: ${fixedRefs}`);
console.log(`   Remaining issues: ${totalRefs - fixedRefs}`);

if (fixedRefs === totalRefs) {
  console.log(`\n🎉 All foreign key references have been fixed!`);
} else {
  console.log(`\n🔧 ${totalRefs - fixedRefs} references still need fixing`);
}
