const fs = require('fs');
const file = '/Users/binayakprajapati/Downloads/Gears/gearops-frontend /app/staff/invoices/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// We want to add an error display for partId and customUnitPrice
// This is around line 732 for parts:
content = content.replace(
  '<Input type="number" min={1} className="h-9 w-full min-w-0 text-center" {...addForm.register(`items.${idx}.quantity`)} />',
  `<div>
    <Input type="number" min={1} className="h-9 w-full min-w-0 text-center" {...addForm.register(\`items.\${idx}.quantity\`)} />
    {addForm.formState.errors.items?.[idx]?.partId && (
      <p className="text-[10px] text-red-500 absolute mt-1">Select part</p>
    )}
  </div>`
);

fs.writeFileSync(file, content);
