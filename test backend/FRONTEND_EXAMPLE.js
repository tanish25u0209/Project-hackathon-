// =====================================================
// FRONTEND INTEGRATION EXAMPLE
// How to connect your frontend to the Research Backend
// =====================================================

// Configuration
const API_BASE = 'http://localhost:3000/api/v1'
const API_KEY = 'dev_local_api_key_9f3b' // Store in environment variable in production

// =====================================================
// 1. CHECK BACKEND HEALTH (On Page Load)
// =====================================================

async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`)
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Backend is up and running')
      console.log(`   Version: ${data.data.version}`)
      console.log(`   Uptime: ${data.data.uptime}s`)
      return true
    }
  } catch (error) {
    console.error('❌ Backend is down:', error.message)
    displayErrorMessage('Backend service is unavailable')
    return false
  }
}

// =====================================================
// 2. SUBMIT RESEARCH REQUEST (When user clicks "Research")
// =====================================================

async function submitResearch(problemStatement) {
  // Validate input
  if (!problemStatement || problemStatement.length < 20) {
    displayErrorMessage('Problem statement must be at least 20 characters')
    return
  }

  // Show loading state
  showLoadingSpinner()

  try {
    const response = await fetch(`${API_BASE}/research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY
      },
      body: JSON.stringify({
        problemStatement,
        metadata: {
          userId: getUserId(),
          source: 'web-app',
          timestamp: new Date().toISOString()
        }
      })
    })

    const data = await response.json()

    if (data.success) {
      console.log('✅ Research request submitted')
      console.log(`   Session ID: ${data.data.sessionId}`)
      console.log(`   Job ID: ${data.data.jobId}`)

      // Store sessionId for polling
      sessionStorage.setItem('currentSessionId', data.data.sessionId)

      // Start polling for results
      startPollingForResults(data.data.sessionId)
    } else {
      throw new Error(data.error?.message || 'Failed to submit research')
    }
  } catch (error) {
    console.error('❌ Error submitting research:', error)
    hideLoadingSpinner()
    displayErrorMessage(`Error: ${error.message}`)
  }
}

// =====================================================
// 3. POLL FOR RESULTS (Every 2 seconds)
// =====================================================

let pollInterval = null

function startPollingForResults(sessionId) {
  console.log(`🔄 Starting to poll session: ${sessionId}`)

  pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE}/research/${sessionId}`, {
        headers: {
          'X-Api-Key': API_KEY
        }
      })

      const data = await response.json()

      if (data.success) {
        const { status, ideas, completedAt } = data.data

        console.log(`   Status: ${status}`)

        // Check if research is complete
        if (status === 'completed' && ideas && ideas.length > 0) {
          console.log(`✅ Research completed! Found ${ideas.length} unique ideas`)

          // Stop polling
          clearInterval(pollInterval)

          // Display results
          displayResults(ideas)
          hideLoadingSpinner()
        }
      }
    } catch (error) {
      console.error('❌ Error polling status:', error)
    }
  }, 2000) // Poll every 2 seconds
}

// =====================================================
// 4. DISPLAY RESULTS TO USER
// =====================================================

function displayResults(ideas) {
  const resultsContainer = document.getElementById('results')
  resultsContainer.innerHTML = ''

  ideas.forEach((idea, index) => {
    const ideaElement = document.createElement('div')
    ideaElement.className = 'idea-card'
    ideaElement.innerHTML = `
      <div class="idea-content">
        <p>${idea.content}</p>
      </div>
      <div class="idea-metadata">
        <span class="confidence">
          Confidence: ${(idea.confidence * 100).toFixed(0)}%
        </span>
        <span class="source">
          Source: ${idea.source}
        </span>
      </div>
      <button onclick="saveIdea('${idea.id}')">Save</button>
    `
    resultsContainer.appendChild(ideaElement)
  })

  // Show results section
  document.getElementById('resultsSection').style.display = 'block'
}

// =====================================================
// 5. HANDLE USER INPUT
// =====================================================

document.getElementById('researchForm').addEventListener('submit', (e) => {
  e.preventDefault()
  const problemStatement = document.getElementById('problemInput').value
  submitResearch(problemStatement)
})

// =====================================================
// 6. UI HELPER FUNCTIONS
// =====================================================

function showLoadingSpinner() {
  document.getElementById('loadingSpinner').style.display = 'block'
  document.getElementById('resultsSection').style.display = 'none'
}

function hideLoadingSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none'
}

function displayErrorMessage(message) {
  const errorDiv = document.getElementById('error')
  errorDiv.textContent = message
  errorDiv.style.display = 'block'
  setTimeout(() => (errorDiv.style.display = 'none'), 5000)
}

function getUserId() {
  // Generate or retrieve user ID
  let userId = localStorage.getItem('userId')
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('userId', userId)
  }
  return userId
}

function saveIdea(ideaId) {
  console.log(`Saving idea: ${ideaId}`)
  // Implement save functionality
}

// =====================================================
// 7. INITIALIZE ON PAGE LOAD
// =====================================================

window.addEventListener('DOMContentLoaded', () => {
  checkBackendHealth()
})

// =====================================================
// HTML TEMPLATE
// =====================================================

/*
<div id="app">
  <div id="error" style="display: none; color: red;"></div>
  
  <form id="researchForm">
    <textarea 
      id="problemInput" 
      placeholder="Enter your research problem (min 20 characters)"
      required
    ></textarea>
    <button type="submit">Research</button>
  </form>

  <div id="loadingSpinner" style="display: none;">
    <p>🔬 Analyzing your problem...</p>
    <p>This may take a moment while we query multiple AI models.</p>
  </div>

  <div id="resultsSection" style="display: none;">
    <h2>Research Results</h2>
    <div id="results"></div>
  </div>
</div>
*/

// =====================================================
// STYLING (CSS)
// =====================================================

/*
#app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

#researchForm {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

#problemInput {
  flex: 1;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

#researchForm button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

#researchForm button:hover {
  background-color: #0056b3;
}

#loadingSpinner {
  text-align: center;
  padding: 40px;
  color: #666;
}

.idea-card {
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.idea-content {
  margin-bottom: 10px;
  line-height: 1.6;
}

.idea-metadata {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
  font-size: 14px;
  color: #666;
}

.confidence {
  font-weight: bold;
}

.source {
  color: #0066cc;
}

.idea-card button {
  padding: 5px 15px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
}

.idea-card button:hover {
  background-color: #218838;
}
*/
