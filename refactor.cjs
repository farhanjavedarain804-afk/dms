const fs = require('fs');
const path = require('path');

// 1. Move and update files
const srcDir = path.join(__dirname, 'src');
const libDir = path.join(srcDir, 'lib');
const integrationsDir = path.join(srcDir, 'integrations', 'supabase');

const dbClientPath = path.join(libDir, 'db-client.ts');
const authMiddlewarePath = path.join(libDir, 'auth-middleware.ts');
const authAttacherPath = path.join(libDir, 'auth-attacher.ts');

if (fs.existsSync(integrationsDir)) {
  const clientTs = fs.readFileSync(path.join(integrationsDir, 'client.ts'), 'utf8');
  fs.writeFileSync(dbClientPath, clientTs.replace(/export const supabase =/g, 'export const db ='));
  
  if (fs.existsSync(path.join(integrationsDir, 'auth-middleware.ts'))) {
    const authMW = fs.readFileSync(path.join(integrationsDir, 'auth-middleware.ts'), 'utf8');
    fs.writeFileSync(authMiddlewarePath, authMW.replace(/requireSupabaseAuth/g, 'requireAuth'));
  }
  
  if (fs.existsSync(path.join(integrationsDir, 'auth-attacher.ts'))) {
    const authAtt = fs.readFileSync(path.join(integrationsDir, 'auth-attacher.ts'), 'utf8');
    fs.writeFileSync(authAttacherPath, authAtt.replace(/attachSupabaseAuth/g, 'attachAuth'));
  }
  
  fs.rmSync(integrationsDir, { recursive: true, force: true });
}

// 2. Global replacements
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let orig = content;
  
  content = content.replace(/@\/integrations\/supabase\/client/g, '@/lib/db-client');
  content = content.replace(/@\/integrations\/supabase\/auth-middleware/g, '@/lib/auth-middleware');
  content = content.replace(/@\/integrations\/supabase\/auth-attacher/g, '@/lib/auth-attacher');
  
  content = content.replace(/import\s+\{\s*supabase\s*\}\s+from\s+['"]@\/lib\/db-client['"]/g, 'import { db } from "@/lib/db-client"');
  content = content.replace(/import\s+\{\s*supabase\s*,\s*/g, 'import { db, ');
  
  content = content.replace(/supabase\.from/g, 'db.from');
  content = content.replace(/supabase\.auth/g, 'db.auth');
  content = content.replace(/supabase\.channel/g, 'db.channel');
  content = content.replace(/supabase\.removeChannel/g, 'db.removeChannel');
  content = content.replace(/supabase\.rpc/g, 'db.rpc');
  content = content.replace(/supabase\.storage/g, 'db.storage');
  
  content = content.replace(/requireSupabaseAuth/g, 'requireAuth');
  content = content.replace(/attachSupabaseAuth/g, 'attachAuth');
  
  // Update client.ts -> db-client.ts supabase references internally
  if (file === dbClientPath) {
    content = content.replace(/Supabase/g, 'Database');
    content = content.replace(/supabase/g, 'db'); 
  }
  
  if (content !== orig) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
