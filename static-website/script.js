// Ai Lendra - Main JavaScript

// Google Sheets ID from your URL
const GOOGLE_SHEET_ID = '11kMQ3nh3P51qgp1qGMurOSzFlJh4g7X0mUCHkdgxa0g';

// Google Apps Script deployment URL - REPLACE WITH YOUR ACTUAL URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxR6rLtKP8VTH4Z9VhY8JqL2kE_NmQjQrWMDvNJ7xPWHGp8uLSkKyNv8lNhNOYXEllk/exec';

// Form submission handler
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('accessForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
});

async function handleFormSubmission(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const buttonText = document.getElementById('buttonText');
    const loadingText = document.getElementById('loadingText');
    const messageDiv = document.getElementById('message');
    
    // Get form data
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    
    // Validate form data
    if (!name || !email) {
        showMessage('Por favor, completa todos los campos', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('Por favor, ingresa un email válido', 'error');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    buttonText.classList.add('hidden');
    loadingText.classList.remove('hidden');
    
    try {
        // Prepare data for submission
        const formData = {
            name: name,
            email: email,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            source: 'ai-lendra-landing'
        };
        
        let submitSuccess = false;
        
        // Try submitting to Google Sheets via Apps Script
        try {
            await submitToGoogleSheets(formData);
            submitSuccess = true;
            console.log('✅ Data submitted to Google Sheets successfully');
        } catch (error) {
            console.error('❌ Google Sheets submission failed:', error);
        }
        
        // Always store locally as backup
        storeDataLocally(formData);
        
        // Store user data for session
        localStorage.setItem('aiLendraUser', JSON.stringify({
            name: name,
            email: email,
            accessTime: new Date().toISOString()
        }));
        
        // Show success message
        if (submitSuccess) {
            showMessage('¡Excelente! Datos guardados en Google Sheets. Redirigiendo al hub...', 'success');
        } else {
            showMessage('¡Perfecto! Accediendo al contenido (datos guardados localmente)...', 'success');
        }
        
        // Redirect to hub after delay
        setTimeout(() => {
            window.location.href = 'hub.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error in form submission:', error);
        
        // Store locally as fallback
        storeDataLocally(formData);
        
        // Still allow access
        showMessage('Accediendo al contenido (datos guardados localmente)...', 'success');
        
        localStorage.setItem('aiLendraUser', JSON.stringify({
            name: name,
            email: email,
            accessTime: new Date().toISOString()
        }));
        
        setTimeout(() => {
            window.location.href = 'hub.html';
        }, 2000);
        
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        buttonText.classList.remove('hidden');
        loadingText.classList.add('hidden');
    }
}

async function submitToGoogleSheets(data) {
    try {
        console.log('📤 Submitting to Google Sheets:', data);
        
        // Method 1: Try direct POST request
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            mode: 'no-cors' // Required for Apps Script CORS
        });
        
        console.log('✅ Request sent to Google Apps Script');
        
    } catch (error) {
        console.error('❌ Direct submission failed:', error);
        
        // Method 2: Try form submission fallback
        try {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = APPS_SCRIPT_URL;
            form.target = '_blank';
            form.style.display = 'none';
            
            // Add form data as hidden inputs
            Object.keys(data).forEach(key => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = data[key];
                form.appendChild(input);
            });
            
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
            
            console.log('✅ Fallback form submission completed');
            
            // Close popup after brief delay
            setTimeout(() => {
                const popups = window.open('', '_blank');
                if (popups && !popups.closed) {
                    popups.close();
                }
            }, 1000);
            
        } catch (fallbackError) {
            console.error('❌ Fallback submission also failed:', fallbackError);
            throw error; // Re-throw original error
        }
    }
}

function storeDataLocally(data) {
    try {
        // Get existing leads from localStorage
        let leads = JSON.parse(localStorage.getItem('aiLendraLeads') || '[]');
        
        // Check if email already exists
        const existingLead = leads.find(lead => lead.email === data.email);
        if (!existingLead) {
            // Add new lead
            leads.push(data);
            
            // Store back to localStorage
            localStorage.setItem('aiLendraLeads', JSON.stringify(leads));
            
            console.log('💾 Data stored locally:', data);
        } else {
            console.log('ℹ️ Email already exists in local storage');
        }
        
    } catch (error) {
        console.error('❌ Error storing data locally:', error);
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    
    const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    const bgClass = type === 'success' ? 'message-success' : 'message-error';
    
    messageDiv.innerHTML = `
        <div class="${bgClass}">
            <i class="fas ${iconClass} mr-2"></i>
            ${text}
        </div>
    `;
    messageDiv.classList.remove('hidden');
    
    // Auto-hide error messages after 5 seconds
    if (type === 'error') {
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Function to export leads data (for manual export)
function exportLeads() {
    const leads = JSON.parse(localStorage.getItem('aiLendraLeads') || '[]');
    
    if (leads.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Convert to CSV
    const headers = ['Fecha', 'Nombre', 'Email', 'User Agent', 'Fuente'];
    const csvContent = [
        headers.join(','),
        ...leads.map(lead => [
            new Date(lead.timestamp).toLocaleString('es-ES'),
            `"${lead.name}"`,
            lead.email,
            `"${lead.userAgent || 'N/A'}"`,
            lead.source || 'N/A'
        ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ai-lendra-leads-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`📊 Exported ${leads.length} leads to CSV`);
}

// Add smooth scrolling and animations
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add form validation improvements
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-ZÀ-ÿ\u00f1\u00d1\s]/g, '');
        });
    }
    
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            if (this.value && !isValidEmail(this.value)) {
                this.style.borderColor = '#ef4444';
                this.style.backgroundColor = '#fef2f2';
            } else {
                this.style.borderColor = '#06b6d4';
                this.style.backgroundColor = '#ffffff';
            }
        });
    }
});

// Add keyboard shortcuts for debugging
document.addEventListener('keydown', function(e) {
    // Alt + E to export leads (for debugging/admin)
    if (e.altKey && e.key === 'e') {
        e.preventDefault();
        exportLeads();
    }
    
    // Alt + C to clear all data (for debugging/admin)
    if (e.altKey && e.key === 'c') {
        e.preventDefault();
        if (confirm('¿Estás seguro de que quieres borrar todos los datos locales?')) {
            localStorage.removeItem('aiLendraLeads');
            localStorage.removeItem('aiLendraUser');
            console.log('🗑️ All local data cleared');
        }
    }
    
    // Alt + T to test submission (for debugging)
    if (e.altKey && e.key === 't') {
        e.preventDefault();
        testSubmission();
    }
});

// Test submission function
function testSubmission() {
    const testData = {
        name: 'Test User ' + Date.now(),
        email: `test${Date.now()}@example.com`,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        source: 'test-submission'
    };
    
    console.log('🧪 Testing submission with data:', testData);
    
    submitToGoogleSheets(testData)
        .then(() => console.log('✅ Test submission completed'))
        .catch(error => console.error('❌ Test submission failed:', error));
    
    storeDataLocally(testData);
}

// Console helper functions for debugging
if (typeof window !== 'undefined') {
    window.aiLendra = {
        exportLeads: exportLeads,
        getLeads: () => JSON.parse(localStorage.getItem('aiLendraLeads') || '[]'),
        clearLeads: () => {
            localStorage.removeItem('aiLendraLeads');
            console.log('🗑️ All leads cleared');
        },
        getUser: () => JSON.parse(localStorage.getItem('aiLendraUser') || 'null'),
        clearUser: () => {
            localStorage.removeItem('aiLendraUser');
            console.log('🗑️ User session cleared');
        },
        testSubmission: testSubmission,
        showStats: () => {
            const leads = JSON.parse(localStorage.getItem('aiLendraLeads') || '[]');
            console.log(`📊 Total leads: ${leads.length}`);
            console.log('📋 Recent leads:', leads.slice(-5));
            return leads;
        }
    };
    
    console.log('%c🚀 Ai Lendra loaded successfully!', 'color: #06b6d4; font-weight: bold; font-size: 16px;');
    console.log('Available debugging commands:');
    console.log('- aiLendra.exportLeads() - Export leads to CSV');
    console.log('- aiLendra.getLeads() - View all stored leads');
    console.log('- aiLendra.showStats() - Show statistics');
    console.log('- aiLendra.testSubmission() - Test Google Sheets integration');
    console.log('- Alt+E - Export leads');
    console.log('- Alt+C - Clear all data');
    console.log('- Alt+T - Test submission');
}