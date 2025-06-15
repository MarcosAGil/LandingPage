// Google Apps Script Code
// Copy this code to your Google Apps Script project (script.google.com)

// IMPORTANT: Replace 'YOUR_SPREADSHEET_ID' with your actual Google Sheets ID
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

/**
 * Handles POST requests to save form data to Google Sheets
 * This function will be called when your static website submits data
 */
function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.name || !data.email) {
      return createResponse('error', 'Missing required fields: name and email');
    }
    
    // Validate email format
    if (!isValidEmail(data.email)) {
      return createResponse('error', 'Invalid email format');
    }
    
    // Open the Google Sheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    
    // Check if this is the first entry and add headers if needed
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Fecha', 'Nombre', 'Email', 'User Agent', 'IP']);
    }
    
    // Get current timestamp
    const timestamp = new Date();
    
    // Get user agent and IP (limited in Apps Script)
    const userAgent = e.parameter.userAgent || 'Unknown';
    const ip = 'Unknown'; // Apps Script doesn't provide real IP
    
    // Append the new row with the form data
    sheet.appendRow([
      timestamp,
      data.name,
      data.email,
      userAgent,
      ip
    ]);
    
    // Log the successful submission
    console.log(`New submission: ${data.name} - ${data.email}`);
    
    return createResponse('success', 'Data saved successfully', {
      timestamp: timestamp.toISOString(),
      rowNumber: sheet.getLastRow()
    });
    
  } catch (error) {
    // Log the error for debugging
    console.error('Error processing form submission:', error);
    
    return createResponse('error', 'Internal server error: ' + error.toString());
  }
}

/**
 * Handles GET requests (for testing purposes)
 */
function doGet(e) {
  return createResponse('info', 'Context Profiles Academy Form Handler is running', {
    timestamp: new Date().toISOString(),
    message: 'Use POST method to submit form data'
  });
}

/**
 * Helper function to create standardized responses
 */
function createResponse(status, message, data = null) {
  const response = {
    status: status,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  if (data) {
    response.data = data;
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Validate email format using regex
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Function to get submission statistics (optional)
 * You can call this function to get stats about your submissions
 */
function getSubmissionStats() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return {
        totalSubmissions: 0,
        latestSubmission: null
      };
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 5);
    const values = range.getValues();
    
    // Get unique emails to count unique users
    const uniqueEmails = new Set();
    let latestSubmission = null;
    
    values.forEach(row => {
      const [timestamp, name, email] = row;
      uniqueEmails.add(email);
      
      if (!latestSubmission || timestamp > latestSubmission.timestamp) {
        latestSubmission = {
          timestamp: timestamp,
          name: name,
          email: email
        };
      }
    });
    
    return {
      totalSubmissions: lastRow - 1,
      uniqueUsers: uniqueEmails.size,
      latestSubmission: latestSubmission
    };
    
  } catch (error) {
    console.error('Error getting stats:', error);
    return { error: error.toString() };
  }
}

/**
 * Function to export data as CSV (optional)
 * This creates a CSV file in your Google Drive
 */
function exportToCSV() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    // Convert to CSV format
    const csvContent = values.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Create CSV file in Google Drive
    const fileName = `context-profiles-leads-${new Date().toISOString().split('T')[0]}.csv`;
    const blob = Utilities.newBlob(csvContent, 'text/csv', fileName);
    const file = DriveApp.createFile(blob);
    
    console.log(`CSV exported: ${file.getUrl()}`);
    return file.getUrl();
    
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return { error: error.toString() };
  }
}

/**
 * Set up a trigger to run daily stats (optional)
 * This will log daily statistics to help you track growth
 */
function createDailyStatsTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'logDailyStats') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new daily trigger
  ScriptApp.newTrigger('logDailyStats')
    .timeBased()
    .everyDays(1)
    .atHour(9) // 9 AM
    .create();
}

/**
 * Function that runs daily to log statistics
 */
function logDailyStats() {
  const stats = getSubmissionStats();
  console.log('Daily Stats:', JSON.stringify(stats, null, 2));
}

/*
SETUP INSTRUCTIONS:
1. Go to script.google.com
2. Create a new project
3. Replace all code with this code
4. Replace 'YOUR_SPREADSHEET_ID_HERE' with your actual spreadsheet ID
5. Save the project
6. Click "Deploy" > "New deployment"
7. Type: "Web app"
8. Execute as: "Me"
9. Who has access: "Anyone"
10. Click "Deploy"
11. Copy the web app URL and update it in your script.js file

TESTING:
- You can test the GET endpoint by visiting the web app URL
- The POST endpoint will be used by your static website form

MONITORING:
- Check the Google Sheets to see submitted data
- Use View > Logs in Apps Script to see execution logs
- Call getSubmissionStats() from the script editor to see statistics
*/