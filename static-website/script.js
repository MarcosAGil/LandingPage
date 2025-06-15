// Context Profiles Academy - Main JavaScript

// IMPORTANT: Your Google Sheets ID from the URL you provided
const GOOGLE_SHEET_ID = '11kMQ3nh3P51qgp1qGMurOSzFlJh4g7X0mUCHkdgxa0g';

// IMPORTANT: Replace this URL with your actual Google Apps Script deployment URL
// After you deploy your Apps Script, it will look like this:
// https://script.google.com/macros/s/AKfycbz...../exec
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID_HERE/exec';

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
            source: 'context-profiles-academy'
        };
        
        // Try to submit to Google Sheets
        let submitSuccess = false;
        
        if (!APPS_SCRIPT_URL.includes('YOUR_DEPLOYMENT_ID_HERE')) {
            try {
                await submitToGoogleSheets(formData);
                submitSuccess = true;
                console.log('Data submitted to Google Sheets successfully');
            } catch (error) {
                console.error('Google Sheets submission failed:', error);
            }
        }
        
        // Always store locally as backup
        storeDataLocally(formData);
        
        // Store user data for session
        localStorage.setItem('cpAcademyUser', JSON.stringify({
            name: name,
            email: email,
            accessTime: new Date().toISOString()
        }));
        
        // Show success message
        if (submitSuccess) {
            showMessage('¡Excelente! Datos guardados. Redirigiendo al hub de módulos...', 'success');
        } else {
            showMessage('¡Perfecto! Accediendo al contenido (datos guardados localmente)...', 'success');
        }
        
        // Redirect to hub after a short delay
        setTimeout(() => {
            window.location.href = 'hub.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting form:', error);
        
        // Store locally as fallback
        storeDataLocally(formData);
        
        // Still allow access
        showMessage('Accediendo al contenido (datos guardados localmente)...', 'success');
        
        localStorage.setItem('cpAcademyUser', JSON.stringify({
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
        // Method 1: Direct fetch to Apps Script
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            mode: 'no-cors' // Required for Apps Script CORS
        });
        
        // Note: With no-cors mode, we can't read the response status
        // But if no error is thrown, the request was sent successfully
        console.log('Request sent to Google Apps Script');
        
    } catch (error) {
        console.error('Apps Script submission error:', error);
        
        // Method 2: Fallback using form submission (opens in new window briefly)
        try {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = APPS_SCRIPT_URL;
            form.target = '_blank';
            form.style.display = 'none';
            
            // Add form data
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
            
            // Close the popup window after a brief delay
            setTimeout(() => {
                const popups = window.open('', '_blank');
                if (popups) popups.close();
            }, 1000);
            
        } catch (fallbackError) {
            console.error('Fallback submission also failed:', fallbackError);
            throw error; // Re-throw original error
        }
    }
}

function storeDataLocally(data) {
    try {
        // Get existing leads from localStorage
        let leads = JSON.parse(localStorage.getItem('cpAcademyLeads') || '[]');
        
        // Check if email already exists
        const existingLead = leads.find(lead => lead.email === data.email);
        if (!existingLead) {
            // Add new lead
            leads.push(data);
            
            // Store back to localStorage
            localStorage.setItem('cpAcademyLeads', JSON.stringify(leads));
            
            console.log('Data stored locally:', data);
        } else {
            console.log('Email already exists in local storage');
        }
        
    } catch (error) {
        console.error('Error storing data locally:', error);
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
    const leads = JSON.parse(localStorage.getItem('cpAcademyLeads') || '[]');
    
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
    link.setAttribute('download', `context-profiles-leads-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`Exported ${leads.length} leads to CSV`);
}

// Add smooth scrolling and animations
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add animation observers for elements coming into view
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all elements with animation class
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
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
                this.style.borderColor = '#d1d5db';
                this.style.backgroundColor = '#ffffff';
            }
        });
    }
});

// Add keyboard shortcuts
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
            localStorage.removeItem('cpAcademyLeads');
            localStorage.removeItem('cpAcademyUser');
            console.log('All local data cleared');
        }
    }
});

// Console helper functions for debugging
if (typeof window !== 'undefined') {
    window.cpAcademy = {
        exportLeads: exportLeads,
        getLeads: () => JSON.parse(localStorage.getItem('cpAcademyLeads') || '[]'),
        clearLeads: () => {
            localStorage.removeItem('cpAcademyLeads');
            console.log('All leads cleared');
        },
        getUser: () => JSON.parse(localStorage.getItem('cpAcademyUser') || 'null'),
        clearUser: () => {
            localStorage.removeItem('cpAcademyUser');
            console.log('User session cleared');
        },
        testSubmission: (name, email) => {
            const testData = {
                name: name || 'Test User',
                email: email || 'test@example.com',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                source: 'test'
            };
            storeDataLocally(testData);
            console.log('Test submission completed:', testData);
        }
    };
    
    console.log('%cContext Profiles Academy loaded successfully!', 'color: #3b82f6; font-weight: bold;');
    console.log('Available commands:');
    console.log('- cpAcademy.exportLeads() - Export leads to CSV');
    console.log('- cpAcademy.getLeads() - View all stored leads');
    console.log('- cpAcademy.clearLeads() - Clear all leads');
    console.log('- cpAcademy.testSubmission() - Test form submission');
}