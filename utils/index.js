export async function getTableFields(
  baseId,
  tableId,
  accessToken,
) {
  const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      toast.error('Sign in and try again');
    }
    throw new Error(`Error: ${response.status}`);
  }

  const data = await response.json();

  const table = data.tables.find((t) => t.id === tableId);

  if (!table) {
    toast.error('Table not found in this base');
    return [];
  }

  const supportedTypes = [
    'singleLineText',
    'multilineText',
    'singleSelect',
    'multipleSelects',
    'multipleAttachments'
  ];

  return table.fields.filter((f) => supportedTypes.includes(f.type));
}