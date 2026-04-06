// ===========================================
// Auto Parts System - Google Apps Script API
// Paste this file into Apps Script as Code.gs
// ===========================================

const SHEET_NAME = 'parts';

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" was not found`);
  }
  return sheet;
}

// Main entry point for GET requests
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action;
  let result;

  if (!action) {
    result = {
      success: false,
      error: 'Missing action parameter. Use the Web App URL with ?action=getAll or ?action=search&q=test'
    };
  } else if (action === 'getAll') {
    result = getAllParts();
  } else if (action === 'search') {
    result = searchPart(params.q);
  } else {
    result = { success: false, error: 'Unknown action' };
  }

  return jsonResponse(result);
}

// Handles add/update/delete
function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return jsonResponse({ success: false, error: 'Missing POST body' });
  }

  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Invalid JSON body' });
  }

  const action = data.action;
  let result;

  if (action === 'add') {
    result = addPart(data.part || {});
  } else if (action === 'update') {
    result = updatePart(data.part || {});
  } else if (action === 'delete') {
    result = deletePart(data.id);
  } else {
    result = { success: false, error: 'Unknown action' };
  }

  return jsonResponse(result);
}

// Get all parts
function getAllParts() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();

  if (!rows.length) {
    return { success: true, data: [] };
  }

  const headers = rows[0];
  const parts = [];

  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;

    const part = {};
    headers.forEach((h, j) => {
      let val = rows[i][j];

      if ((h === 'dims' || h === 'fitment') && typeof val === 'string' && val) {
        try {
          val = JSON.parse(val);
        } catch (err) {
          val = h === 'fitment' ? [] : {};
        }
      }

      part[h] = val;
    });

    parts.push(part);
  }

  return { success: true, data: parts };
}

// Add a new part
function addPart(part) {
  const sheet = getSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  part.id = Date.now();

  const row = headers.map(h => {
    let val = part[h] ?? '';
    if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
    return val;
  });

  sheet.appendRow(row);
  return { success: true, id: part.id, message: 'Added successfully' };
}

// Update an existing part
function updatePart(part) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0] || [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(part.id)) {
      const row = headers.map(h => {
        let val = part[h] ?? '';
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        return val;
      });

      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { success: true, message: 'Updated successfully' };
    }
  }

  return { success: false, error: 'Part not found' };
}

// Delete a part
function deletePart(id) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Deleted successfully' };
    }
  }

  return { success: false, error: 'Part not found' };
}

// Search for a part
function searchPart(q) {
  const all = getAllParts();
  if (!all.success) return all;

  q = String(q || '');
  const ql = q.toLowerCase();

  const results = all.data.filter(p =>
    String(p.num || '').toLowerCase().includes(ql) ||
    String(p.name || '').toLowerCase().includes(ql) ||
    (p.dims && p.dims.altcode && String(p.dims.altcode).toLowerCase().includes(ql))
  );

  return { success: true, data: results };
}

// Optional helper for testing inside the Apps Script editor
function testGetAll() {
  Logger.log(doGet({ parameter: { action: 'getAll' } }).getContent());
}
