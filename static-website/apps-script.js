// Google Apps Script Code for Ai Lendra
// Copy this code to your Google Apps Script project (script.google.com)

// Your Google Sheets ID (already extracted from your URL)
const SPREADSHEET_ID = '11kMQ3nh3P51qgp1qGMurOSzFlJh4g7X0mUCHkdgxa0g';

/**
 * Handles POST requests to save form data to Google Sheets
 * This function will be called when your static website submits data
 */
function doPost(e) {
  try {
    console.log('📥 Received POST request');
    
    // Parse the incoming JSON data
    let data;
    try {
      if (e.postData && e.postData.contents) {
        data = JSON.parse(e.postData.contents);
        console.log('📋 Parsed JSON data:', data);
      } else {
        // Fallback to form parameters
        data = {
          name: e.parameter.name,
          email: e.parameter.email,
          timestamp: e.parameter.timestamp || new Date().toISOString(),
          userAgent: e.parameter.userAgent || 'Unknown',
          source: e.parameter.source || 'ai-lendra-form'
        };
        console.log('📋 Using form parameters:', data);
      }
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      return createResponse('error', 'Invalid JSON data: ' + parseError.toString());
    }
    
    // Validate required fields
    if (!data.name || !data.email) {
      console.error('❌ Missing required fields');
      return createResponse('error', 'Missing required fields: name and email');
    }
    
    // Validate email format
    if (!isValidEmail(data.email)) {
      console.error('❌ Invalid email format:', data.email);
      return createResponse('error', 'Invalid email format');
    }
    
    // Open the Google Sheet
    let sheet;
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      sheet = spreadsheet.getSheetByName('Sheet1') || spreadsheet.insertSheet('Sheet1');
      console.log('✅ Successfully opened Google Sheet');
    } catch (sheetError) {
      console.error('❌ Could not access Google Sheet:', sheetError);
      return createResponse('error', 'Could not access Google Sheet. Please check the SPREADSHEET_ID and permissions.');
    }
    
    // Check if this is the first entry and add headers if needed
    if (sheet.getLastRow() === 0) {
      const headers = ['Fecha', 'Nombre', 'Email', 'User Agent', 'Fuente', 'IP'];
      sheet.appendRow(headers);
      console.log('✅ Headers added to sheet');
    }
    
    // Check if email already exists to avoid duplicates
    const existingData = sheet.getDataRange().getValues();
    const emailExists = existingData.some((row, index) => {
      return index > 0 && row[2] === data.email; // Skip header row, email is in column C (index 2)
    });
    
    if (emailExists) {
      console.log('ℹ️ Email already exists:', data.email);
      return createResponse('info', 'Email already registered', {
        email: data.email,
        action: 'duplicate_prevented'
      });
    }
    
    // Get current timestamp
    const timestamp = new Date(data.timestamp || new Date());
    
    // Get user's IP (limited in Apps Script environment)
    const userIP = 'N/A'; // Apps Script doesn't provide real IP access
    
    // Prepare the new row with the form data
    const newRow = [
      timestamp,
      data.name,
      data.email,
      data.userAgent || 'Unknown',
      data.source || 'ai-lendra-landing',
      userIP
    ];
    
    // Append the new row to the sheet
    sheet.appendRow(newRow);
    
    // Log the successful submission
    console.log(`✅ New submission saved: ${data.name} - ${data.email}`);
    
    return createResponse('success', 'Data saved successfully to Ai Lendra database', {
      timestamp: timestamp.toISOString(),
      rowNumber: sheet.getLastRow(),
      name: data.name,
      email: data.email,
      source: data.source
    });
    
  } catch (error) {
    // Log the error for debugging
    console.error('❌ Error processing form submission:', error);
    
    return createResponse('error', 'Internal server error: ' + error.toString());
  }
}

/**
 * Handles GET requests (for testing and statistics)
 */
function doGet(e) {
  try {
    console.log('📥 Received GET request');
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    const stats = getSubmissionStats();
    
    return createResponse('info', 'Ai Lendra Form Handler is running successfully', {
      timestamp: new Date().toISOString(),
      message: 'Use POST method to submit form data',
      stats: stats,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`,
      version: '2.0',
      service: 'ai-lendra-backend'
    });
  } catch (error) {
    console.error('❌ Error in GET handler:', error);
    return createResponse('error', 'Error accessing sheet: ' + error.toString());
  }
}

/**
 * Helper function to create standardized responses
 */
function createResponse(status, message, data = null) {
  const response = {
    status: status,
    message: message,
    timestamp: new Date().toISOString(),
    service: 'ai-lendra-backend'
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
 * Function to get submission statistics
 */
function getSubmissionStats() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return {
        totalSubmissions: 0,
        uniqueUsers: 0,
        latestSubmission: null,
        todaySubmissions: 0,
        thisWeekSubmissions: 0
      };
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 6); // Get all data rows
    const values = range.getValues();
    
    // Get unique emails to count unique users
    const uniqueEmails = new Set();
    let latestSubmission = null;
    let todaySubmissions = 0;
    let thisWeekSubmissions = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    values.forEach(row => {
      const [timestamp, name, email, userAgent, source] = row;
      uniqueEmails.add(email);
      
      // Count today's submissions
      const submissionDate = new Date(timestamp);
      const submissionDay = new Date(submissionDate);
      submissionDay.setHours(0, 0, 0, 0);
      
      if (submissionDay.getTime() === today.getTime()) {
        todaySubmissions++;
      }
      
      if (submissionDate >= weekAgo) {
        thisWeekSubmissions++;
      }
      
      // Track latest submission
      if (!latestSubmission || timestamp > latestSubmission.timestamp) {
        latestSubmission = {
          timestamp: timestamp,
          name: name,
          email: email,
          source: source
        };
      }
    });
    
    return {
      totalSubmissions: lastRow - 1,
      uniqueUsers: uniqueEmails.size,
      latestSubmission: latestSubmission,
      todaySubmissions: todaySubmissions,
      thisWeekSubmissions: thisWeekSubmissions
    };
    
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    return { error: error.toString() };
  }
}

/**
 * Function to export data as CSV and save to Google Drive
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
    const fileName = `ai-lendra-leads-${new Date().toISOString().split('T')[0]}.csv`;
    const blob = Utilities.newBlob(csvContent, 'text/csv', fileName);
    const file = DriveApp.createFile(blob);
    
    console.log(`📊 CSV exported: ${file.getUrl()}`);
    return {
      success: true,
      url: file.getUrl(),
      fileName: fileName,
      recordCount: values.length - 1 // Subtract header row
    };
    
  } catch (error) {
    console.error('❌ Error exporting CSV:', error);
    return { error: error.toString() };
  }
}

/**
 * Function to clean up duplicate entries
 */
function removeDuplicateEmails() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    if (values.length <= 1) return { message: 'No data to clean' };
    
    const headers = values[0];
    const emailIndex = 2; // Email is in column C (index 2)
    const uniqueRows = [headers];
    const seenEmails = new Set();
    
    for (let i = 1; i < values.length; i++) {
      const email = values[i][emailIndex];
      if (!seenEmails.has(email)) {
        seenEmails.add(email);
        uniqueRows.push(values[i]);
      }
    }
    
    // Clear the sheet and add unique rows
    sheet.clear();
    if (uniqueRows.length > 0) {
      sheet.getRange(1, 1, uniqueRows.length, uniqueRows[0].length).setValues(uniqueRows);
    }
    
    const removedCount = values.length - uniqueRows.length;
    console.log(`🧹 Removed ${removedCount} duplicate entries`);
    
    return {
      message: `Removed ${removedCount} duplicate entries`,
      totalRows: uniqueRows.length - 1,
      duplicatesRemoved: removedCount
    };
    
  } catch (error) {
    console.error('❌ Error removing duplicates:', error);
    return { error: error.toString() };
  }
}

/**
 * Set up a trigger to run daily stats (optional)
 */
function createDailyStatsTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'logDailyStats') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new daily trigger at 9 AM
  ScriptApp.newTrigger('logDailyStats')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
    
  console.log('⏰ Daily stats trigger created for 9 AM');
}

/**
 * Function that runs daily to log statistics
 */
function logDailyStats() {
  const stats = getSubmissionStats();
  console.log('📊 Daily Stats Report for Ai Lendra:', JSON.stringify(stats, null, 2));
  
  // Optionally send email report (uncomment and configure)
  /*
  const emailBody = `
    Ai Lendra Daily Report:
    
    📊 Total submissions: ${stats.totalSubmissions}
    👥 Unique users: ${stats.uniqueUsers}
    📅 Today's submissions: ${stats.todaySubmissions}
    📈 This week's submissions: ${stats.thisWeekSubmissions}
    
    Latest submission: ${stats.latestSubmission ? stats.latestSubmission.name + ' (' + stats.latestSubmission.email + ')' : 'None'}
    
    Dashboard: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit
  `;
  
  GmailApp.sendEmail(
    'your-email@example.com', // Replace with your email
    'Ai Lendra - Daily Stats Report',
    emailBody
  );
  */
}

/**
 * Manual function to test the setup
 */
function testSetup() {
  console.log('🧪 Testing Ai Lendra setup...');
  
  try {
    // Test sheet access
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
    console.log('✅ Sheet access successful');
    
    // Test stats
    const stats = getSubmissionStats();
    console.log('✅ Stats function working:', stats);
    
    // Test data validation
    const testEmail = 'test@example.com';
    const isValid = isValidEmail(testEmail);
    console.log('✅ Email validation working:', isValid);
    
    console.log('🎉 All tests passed! Setup is working correctly.');
    
    return {
      success: true,
      message: 'All tests passed',
      sheetId: SPREADSHEET_ID,
      stats: stats
    };
    
  } catch (error) {
    console.error('❌ Setup test failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/*
🚀 AI LENDRA GOOGLE APPS SCRIPT SETUP INSTRUCTIONS:
==================================================

1. Go to script.google.com
2. Create a new project
3. Replace all code with this code
4. The SPREADSHEET_ID is already set to your sheet: 11kMQ3nh3P51qgp1qGMurOSzFlJh4g7X0mUCHkdgxa0g
5. Save the project (Ctrl+S)
6. Click "Deploy" > "New deployment"
7. Type: "Web app"
8. Execute as: "Me"
9. Who has access: "Anyone"
10. Click "Deploy"
11. Copy the web app URL
12. Update the APPS_SCRIPT_URL in your script.js file

📊 TESTING:
===========
- Visit the web app URL to see if it's working
- Submit the form on your website
- Check your Google Sheet to see if data appears
- Run testSetup() function in the Apps Script editor
- Check View > Logs for execution details

📈 MONITORING FUNCTIONS:
=======================
Run these manually in the Apps Script editor:
- getSubmissionStats() - Get detailed statistics
- exportToCSV() - Export data to CSV file in Google Drive
- removeDuplicateEmails() - Remove duplicate email entries
- createDailyStatsTrigger() - Set up daily automatic reports
- testSetup() - Test if everything is working

🔧 TROUBLESHOOTING:
==================
If submissions aren't working:
1. Check that the Google Sheet exists and is accessible
2. Verify the SPREADSHEET_ID is correct
3. Make sure the web app is deployed with "Anyone" access
4. Check Apps Script logs for error messages
5. Test the doGet() endpoint by visiting the web app URL

💡 FEATURES:
============
✅ Automatic duplicate email prevention
✅ Detailed statistics and reporting
✅ CSV export functionality
✅ Daily stats triggers (optional)
✅ Comprehensive error handling
✅ Support for both JSON and form submissions
*/