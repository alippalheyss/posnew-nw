const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, 'src', 'pages', 'Admin.tsx');
let content = fs.readFileSync(adminPath, 'utf8');

// Replace expandedSections state with activeTab
content = content.replace(
  /const \[expandedSections, setExpandedSections\] = useState\(\{[\s\S]*?\}\);\s*const toggleSection = [\s\S]*?\}\);/m,
  'const [activeTab, setActiveTab] = useState("shopSettings");'
);

// Replace SectionHeader component definition (it won't be used anymore)
content = content.replace(
  /const SectionHeader = \(\{ id, icon: Icon, title, expanded \}: any\) => \([\s\S]*?\);/m,
  ''
);

// Replace the main ScrollArea and layout structure
content = content.replace(
  /<ScrollArea className="flex-1 custom-scrollbar">\s*<div className="max-w-4xl mx-auto space-y-6 pb-10">/,
  `<div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full gap-6 pb-6">
          <div className="w-64 flex-shrink-0 bg-[#0a0a1a] rounded-3xl border border-white/5 p-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
            <Button variant={activeTab === 'shopSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('shopSettings')}><Building2 className="h-4 w-4" /> {renderBoth('shop_settings')}</Button>
            <Button variant={activeTab === 'accountingSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('accountingSettings')}><Landmark className="h-4 w-4" /> {renderBoth('accounting_settings')}</Button>
            <Button variant={activeTab === 'softwareSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('softwareSettings')}><Monitor className="h-4 w-4" /> {renderBoth('software_settings')}</Button>
            <Button variant={activeTab === 'generalSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('generalSettings')}><Layout className="h-4 w-4" /> {renderBoth('general_settings')}</Button>
            <Button variant={activeTab === 'reportSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('reportSettings')}><FileText className="h-4 w-4" /> {renderBoth('report_settings')}</Button>
            <Button variant={activeTab === 'printingSettings' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('printingSettings')}><Printer className="h-4 w-4" /> {renderBoth('printing_settings')}</Button>
            <Button variant={activeTab === 'userManagement' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('userManagement')}><Users className="h-4 w-4" /> {renderBoth('user_management')}</Button>
            <Button variant={activeTab === 'dataManagement' ? 'default' : 'ghost'} className="justify-start gap-3 rounded-xl font-bold" onClick={() => setActiveTab('dataManagement')}><Database className="h-4 w-4" /> {renderBoth('data_management')}</Button>
          </div>
          <ScrollArea className="flex-1 custom-scrollbar bg-[#0a0a1a] rounded-3xl border border-white/5">
            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">`
);

// Close the new flex div at the end
content = content.replace(
  /<\/div>\s*<\/ScrollArea>\s*<UserDialog/,
  `</div>\n          </ScrollArea>\n       </div>\n       <UserDialog`
);

const sections = [
  'shopSettings',
  'accountingSettings',
  'softwareSettings',
  'generalSettings',
  'reportSettings',
  'printingSettings',
  'userManagement',
  'dataManagement'
];

for (const section of sections) {
  const regex = new RegExp(
    `<Card className="[^"]*">\\s*<SectionHeader[^>]*/>\\s*\\{expandedSections\\.${section} && \\(\\s*<CardContent className="[^"]*">([\\s\\S]*?)<\\/CardContent>\\s*\\)\\}\\s*<\\/Card>`,
    'm'
  );
  
  content = content.replace(regex, `{activeTab === '${section}' && (\n                  <div className="space-y-8">\n                    $1\n                  </div>\n                )}`);
}

fs.writeFileSync(adminPath, content);
console.log('Successfully refactored Admin.tsx');
