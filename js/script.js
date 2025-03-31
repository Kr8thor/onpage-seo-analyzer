// DOM Elements
const seoForm = document.getElementById('seoForm');
const urlInput = document.getElementById('urlInput');
const keywordInput = document.getElementById('keywordInput');
const countryInput = document.getElementById('countryInput');
const analyzeButton = document.getElementById('analyzeButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorDisplay = document.getElementById('errorDisplay');
const resultsSection = document.getElementById('resultsSection');

// API Configuration
const API_URL = 'https://onpage-seo-analyzer.onrender.com/analyze';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Utility Functions
function formatNumber(value) {
    if (typeof value !== 'number') return 'N/A';
    return value.toFixed(2);
}

function formatPercentage(value) {
    if (typeof value !== 'number') return 'N/A';
    return `${value.toFixed(2)}%`;
}

function validateUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Form Submission Handler
seoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get and trim input values
    const url = urlInput.value.trim();
    const keyword = keywordInput.value.trim();
    const country = countryInput.value.trim() || 'us';

    // Basic validation
    if (!url || !keyword) {
        showError('Please provide both URL and keyword');
        return;
    }

    // Validate URL format
    if (!validateUrl(url)) {
        showError('Please enter a valid URL');
        return;
    }

    // Show loading state
    setLoading(true);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, keyword, country }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || response.statusText);
        }

        if (data.status !== 'success') {
            throw new Error(data.error_message || 'Analysis failed');
        }

        displayResults(data);
    } catch (error) {
        if (error.name === 'AbortError') {
            showError('Request timed out. Please try again.');
        } else {
            showError(error.message || 'Network error or API unavailable');
        }
    } finally {
        setLoading(false);
    }
});

// Loading State Management
function setLoading(isLoading) {
    loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    analyzeButton.disabled = isLoading;
    if (!isLoading) {
        errorDisplay.style.display = 'none';
    }
}

// Error Display
function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
    resultsSection.style.display = 'none';
}

// Results Display
function displayResults(data) {
    // Validate response data
    if (!data.target_analysis) {
        showError('Invalid response format from server');
        return;
    }

    // Clear previous results and errors
    errorDisplay.style.display = 'none';
    resultsSection.style.display = 'block';

    // Remove any existing warning message
    const existingWarning = document.querySelector('.warning-message');
    if (existingWarning) {
        existingWarning.remove();
    }

    // Display target information
    const targetInfo = document.querySelector('#targetInfo .card-content');
    targetInfo.innerHTML = `
        <p><strong>URL:</strong> ${data.target_analysis.url}</p>
        <p><strong>Keyword:</strong> ${data.target_analysis.keyword}</p>
    `;

    // Display title analysis
    const titleAnalysis = document.querySelector('#titleAnalysis .card-content');
    titleAnalysis.innerHTML = `
        <p><strong>Title:</strong> ${data.target_analysis.title?.text || 'Not found'}</p>
        <p><strong>Length:</strong> ${formatNumber(data.target_analysis.title?.length)} characters</p>
        <p><strong>Keyword Position:</strong> ${data.target_analysis.title?.keyword_position || 'Not found'}</p>
    `;

    // Display meta description
    const metaAnalysis = document.querySelector('#metaAnalysis .card-content');
    metaAnalysis.innerHTML = `
        <p><strong>Description:</strong> ${data.target_analysis.meta_description?.text || 'Not found'}</p>
        <p><strong>Length:</strong> ${formatNumber(data.target_analysis.meta_description?.length)} characters</p>
        <p><strong>Keyword Position:</strong> ${data.target_analysis.meta_description?.keyword_position || 'Not found'}</p>
    `;

    // Display headings analysis
    const headingsAnalysis = document.querySelector('#headingsAnalysis .card-content');
    headingsAnalysis.innerHTML = `
        <p><strong>H1 Count:</strong> ${formatNumber(data.target_analysis.headings?.h1_count)}</p>
        <p><strong>H2 Count:</strong> ${formatNumber(data.target_analysis.headings?.h2_count)}</p>
        <p><strong>H3 Count:</strong> ${formatNumber(data.target_analysis.headings?.h3_count)}</p>
        <p><strong>Keyword in H1:</strong> ${data.target_analysis.headings?.keyword_in_h1 ? 'Yes' : 'No'}</p>
    `;

    // Display content analysis
    const contentAnalysis = document.querySelector('#contentAnalysis .card-content');
    contentAnalysis.innerHTML = `
        <p><strong>Word Count:</strong> ${formatNumber(data.target_analysis.content?.word_count)}</p>
        <p><strong>Keyword Density:</strong> ${formatPercentage(data.target_analysis.content?.keyword_density)}</p>
        <p><strong>Readability Score:</strong> ${formatNumber(data.target_analysis.content?.readability_score)}</p>
    `;

    // Display links analysis
    const linksAnalysis = document.querySelector('#linksAnalysis .card-content');
    linksAnalysis.innerHTML = `
        <p><strong>Internal Links:</strong> ${formatNumber(data.target_analysis.links?.internal_count)}</p>
        <p><strong>External Links:</strong> ${formatNumber(data.target_analysis.links?.external_count)}</p>
        <p><strong>Broken Links:</strong> ${formatNumber(data.target_analysis.links?.broken_count)}</p>
    `;

    // Display images analysis
    const imagesAnalysis = document.querySelector('#imagesAnalysis .card-content');
    imagesAnalysis.innerHTML = `
        <p><strong>Total Images:</strong> ${formatNumber(data.target_analysis.images?.total_count)}</p>
        <p><strong>Images with Alt:</strong> ${formatNumber(data.target_analysis.images?.with_alt_count)}</p>
        <p><strong>Images without Alt:</strong> ${formatNumber(data.target_analysis.images?.without_alt_count)}</p>
    `;

    // Display schema analysis
    const schemaAnalysis = document.querySelector('#schemaAnalysis .card-content');
    schemaAnalysis.innerHTML = `
        <p><strong>Schema Types:</strong> ${data.target_analysis.schema?.types?.join(', ') || 'None found'}</p>
        <p><strong>Valid Schema:</strong> ${data.target_analysis.schema?.is_valid ? 'Yes' : 'No'}</p>
    `;

    // Display technical analysis
    const techAnalysis = document.querySelector('#techAnalysis .card-content');
    techAnalysis.innerHTML = `
        <p><strong>Mobile Responsive:</strong> ${data.target_analysis.technical?.mobile_responsive ? 'Yes' : 'No'}</p>
        <p><strong>SSL Enabled:</strong> ${data.target_analysis.technical?.ssl_enabled ? 'Yes' : 'No'}</p>
        <p><strong>Canonical URL:</strong> ${data.target_analysis.technical?.canonical_url || 'Not set'}</p>
    `;

    // Display performance metrics
    const performanceAnalysis = document.querySelector('#performanceAnalysis .card-content');
    performanceAnalysis.innerHTML = `
        <p><strong>Page Load Time:</strong> ${formatNumber(data.target_analysis.performance?.page_load_time)}s</p>
        <p><strong>First Contentful Paint:</strong> ${formatNumber(data.target_analysis.performance?.first_contentful_paint)}s</p>
        <p><strong>Time to Interactive:</strong> ${formatNumber(data.target_analysis.performance?.time_to_interactive)}s</p>
    `;

    // Display benchmarks
    const benchmarksDisplay = document.querySelector('#benchmarksDisplay .card-content');
    benchmarksDisplay.innerHTML = `
        <p><strong>Word Count Benchmark:</strong> ${data.target_analysis.benchmarks?.word_count || 'N/A'}</p>
        <p><strong>Keyword Density Benchmark:</strong> ${data.target_analysis.benchmarks?.keyword_density || 'N/A'}</p>
        <p><strong>Readability Benchmark:</strong> ${data.target_analysis.benchmarks?.readability || 'N/A'}</p>
    `;

    // Display recommendations
    const recommendationsDisplay = document.querySelector('#recommendationsDisplay .card-content');
    if (Array.isArray(data.target_analysis.recommendations)) {
        recommendationsDisplay.innerHTML = data.target_analysis.recommendations
            .map(rec => `
                <div class="recommendation sev-${(rec.severity || 'medium').toLowerCase()}">
                    <p><strong>${rec.title || 'Untitled Recommendation'}</strong></p>
                    <p>${rec.description || 'No description available'}</p>
                    ${rec.resource_link ? `<p><a href="${rec.resource_link}" target="_blank" rel="noopener noreferrer">Learn more</a></p>` : ''}
                </div>
            `)
            .join('');
    } else {
        recommendationsDisplay.innerHTML = '<p>No recommendations available</p>';
    }

    // Display competitor summary
    const competitorSummary = document.querySelector('#competitorSummary .card-content');
    if (Array.isArray(data.competitor_analysis_summary) && data.competitor_analysis_summary.length > 0) {
        competitorSummary.innerHTML = `
            <table class="competitor-table">
                <thead>
                    <tr>
                        <th>URL</th>
                        <th>Title Length</th>
                        <th>Word Count</th>
                        <th>Keyword Density</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.competitor_analysis_summary.map(comp => `
                        <tr>
                            <td>${comp.url || 'N/A'}</td>
                            <td>${formatNumber(comp.title_length)}</td>
                            <td>${formatNumber(comp.word_count)}</td>
                            <td>${formatPercentage(comp.keyword_density)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        competitorSummary.innerHTML = '<p>No competitor data available</p>';
    }

    // Display warning if present
    if (data.warning) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message';
        warningDiv.textContent = data.warning;
        resultsSection.insertBefore(warningDiv, resultsSection.firstChild);
    }
} 