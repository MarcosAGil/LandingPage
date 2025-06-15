// Context Profiles Academy - Main JavaScript

// IMPORTANT: Replace this URL with your actual Google Apps Script deployment URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID_HERE/exec';

// Form submission handler
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('accessForm');
    const submitBtn = document.getElementById('submitBtn');
    const buttonText = document.getElementById('buttonText');
    const loadingText = document.getElementById('loadingText');
    const messageDiv = document.getElementById('message');

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
            timestamp: new Date().toISOString()
        };
        
        // Submit to Google Sheets (if URL is configured)
        if (APPS_SCRIPT_URL.includes('YOUR_DEPLOYMENT_ID_HERE')) {
            // If Google Apps Script is not configured, store locally
            console.log('Google Apps Script URL not configured. Storing data locally.');
            storeDataLocally(formData);
        } else {
            // Submit to Google Sheets
            await submitToGoogleSheets(formData);
        }
        
        // Store user data for session
        localStorage.setItem('cpAcademyUser', JSON.stringify({
            name: name,
            email: email,
            accessTime: new Date().toISOString()
        }));
        
        // Show success message
        showMessage('¡Excelente! Redirigiendo al hub de módulos...', 'success');
        
        // Redirect to hub after a short delay
        setTimeout(() => {
            window.location.href = 'hub.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting form:', error);
        
        // Store locally as fallback
        storeDataLocally(formData);
        
        // Still allow access but show warning
        showMessage('Datos guardados localmente. Accediendo al contenido...', 'success');
        
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
    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        mode: 'no-cors' // Required for Google Apps Script
    });
    
    // Note: With no-cors mode, we can't read the response
    // But the request will be sent successfully
    console.log('Data submitted to Google Sheets');
}

function storeDataLocally(data) {
    // Get existing leads from localStorage
    let leads = JSON.parse(localStorage.getItem('cpAcademyLeads') || '[]');
    
    // Add new lead
    leads.push(data);
    
    // Store back to localStorage
    localStorage.setItem('cpAcademyLeads', JSON.stringify(leads));
    
    console.log('Data stored locally:', data);
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = `
        <div class="message-${type}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} mr-2"></i>
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
    const headers = ['Fecha', 'Nombre', 'Email'];
    const csvContent = [
        headers.join(','),
        ...leads.map(lead => [
            new Date(lead.timestamp).toLocaleString(),
            `"${lead.name}"`,
            lead.email
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
}

// Add export function to window for console access
window.exportLeads = exportLeads;

// Add CSS for animations and effects
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
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Alt + E to export leads (for debugging/admin)
    if (e.altKey && e.key === 'e') {
        e.preventDefault();
        exportLeads();
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
        }
    };
    
    console.log('Context Profiles Academy loaded. Use cpAcademy.exportLeads() to export data.');
}