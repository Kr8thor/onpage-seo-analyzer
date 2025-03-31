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
const API_URL = 'https://on-page-seo-advisor-1.onrender.com/analyze';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Country code mapping
const COUNTRY_CODES = {
    'united states': 'us',
    'ireland': 'ie',
    'united kingdom': 'gb',
    'canada': 'ca',
    'australia': 'au',
    'new zealand': 'nz',
    'germany': 'de',
    'france': 'fr',
    'spain': 'es',
    'italy': 'it',
    'japan': 'jp',
    'korea': 'kr',
    'china': 'cn',
    'india': 'in',
    'brazil': 'br',
    'mexico': 'mx',
    'russia': 'ru',
    'south africa': 'za'
};

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

function getCountryCode(countryName) {
    if (!countryName) return 'us'; // Default to US if no country specified
    
    // Clean and normalize the input
    const normalizedInput = countryName.toLowerCase().trim();
    
    // First try direct match
    if (COUNTRY_CODES[normalizedInput]) {
        return COUNTRY_CODES[normalizedInput];
    }
    
    // If input is already a valid 2-letter code, return it
    if (/^[a-z]{2}$/.test(normalizedInput)) {
        return normalizedInput;
    }
    
    // Try to find a partial match in the keys
    const matchingKey = Object.keys(COUNTRY_CODES).find(key => 
        key.includes(normalizedInput) || normalizedInput.includes(key)
    );
    
    if (matchingKey) {
        return COUNTRY_CODES[matchingKey];
    }
    
    console.warn(`Country code not found for "${countryName}", defaulting to "us"`);
    return 'us'; // Default to US if no match found
}

// Additional Utility Functions
function getMetricStatus(value, benchmark, type = 'higher') {
    if (typeof value !== 'number' || typeof benchmark !== 'number') return 'neutral';
    const percentage = ((value - benchmark) / benchmark) * 100;
    if (type === 'higher') {
        return percentage >= 10 ? 'good' : percentage <= -10 ? 'bad' : 'neutral';
    } else {
        return percentage <= -10 ? 'good' : percentage >= 10 ? 'bad' : 'neutral';
    }
}

function formatMetric(value, type = 'number') {
    if (typeof value !== 'number') return 'N/A';
    switch (type) {
        case 'percentage':
            return `${value.toFixed(2)}%`;
        case 'time':
            return `${value.toFixed(2)}s`;
        case 'count':
            return value.toLocaleString();
        default:
            return value.toFixed(2);
    }
}

// Form Submission Handler
seoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get and trim input values
    const url = urlInput.value.trim();
    const keyword = keywordInput.value.trim();
    const countryInput = document.getElementById('countryInput').value.trim();
    const country = getCountryCode(countryInput);
    
    console.log('Country input:', countryInput, '-> Country code:', country);

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
        console.log('Starting request...');
        console.log('API URL:', API_URL);
        console.log('Request payload:', { url, keyword, country });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        
        console.log('Sending fetch request...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ url, keyword, country }),
            signal: controller.signal
        }).catch(error => {
            console.error('Fetch error:', error);
            throw error;
        });
        
        clearTimeout(timeoutId);
        
        console.log('Response received:', {
            status: response.status,
            statusText: response.statusText
        });
        
        console.log('Parsing response JSON...');
        const data = await response.json().catch(error => {
            console.error('JSON parsing error:', error);
            throw new Error('Failed to parse response data');
        });
        
        console.log('Response data:', data);

        if (!response.ok) {
            // Handle specific error cases
            if (response.status === 422) {
                throw new Error('Invalid input data. Please check your URL and keyword.');
            } else if (response.status >= 500) {
                throw new Error('Server error. Please try again later.');
            }
            throw new Error(data.detail || response.statusText || `HTTP error! status: ${response.status}`);
        }

        if (!data || data.status !== 'success') {
            throw new Error(data.error_message || 'Analysis failed');
        }

        if (!data.target_analysis) {
            throw new Error('No analysis data received');
        }

        console.log('Displaying results...');
        displayResults(data);
    } catch (error) {
        console.error('Error in form submission:', error);
        if (error.name === 'AbortError') {
            showError('Request timed out. Please try again.');
        } else if (error.message.includes('Failed to fetch')) {
            showError('Unable to connect to the server. Please check if the service is available.');
        } else if (error.message.includes('parse response data')) {
            showError('Invalid response from server. Please try again.');
        } else {
            showError(`Error: ${error.message || 'Network error or API unavailable'}`);
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
    console.log('Raw response data:', data);
    
    // Validate response data
    if (!data) {
        showError('No data received from server');
        return;
    }

    // Check if we're getting the raw analysis data directly
    const analysisData = data.target_analysis || data;
    console.log('Analysis data:', analysisData);

    if (!analysisData) {
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

    try {
        // Display target information with status indicators
        const targetInfo = document.querySelector('#targetInfo .card-content');
        targetInfo.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">URL:</span>
                    <span class="value">${analysisData.url || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="label">Keyword:</span>
                    <span class="value">${analysisData.keyword || 'N/A'}</span>
                </div>
            </div>
        `;

        // Display title analysis with status indicators
        const titleAnalysis = document.querySelector('#titleAnalysis .card-content');
        const titleStatus = getMetricStatus(analysisData.title?.length, 60);
        titleAnalysis.innerHTML = `
            <div class="metric-grid">
                <div class="metric-item ${titleStatus}">
                    <span class="label">Title Length</span>
                    <span class="value">${formatMetric(analysisData.title?.length)} characters</span>
                    <span class="tooltip">Recommended: 50-60 characters</span>
                </div>
                <div class="metric-item">
                    <span class="label">Title Text</span>
                    <span class="value">${analysisData.title?.text || 'Not found'}</span>
                </div>
                <div class="metric-item">
                    <span class="label">Keyword Position</span>
                    <span class="value">${analysisData.title?.keyword_position || 'Not found'}</span>
                </div>
            </div>
        `;

        // Display meta description with status indicators
        const metaAnalysis = document.querySelector('#metaAnalysis .card-content');
        const metaStatus = getMetricStatus(analysisData.meta_description?.length, 160);
        metaAnalysis.innerHTML = `
            <div class="metric-grid">
                <div class="metric-item ${metaStatus}">
                    <span class="label">Description Length</span>
                    <span class="value">${formatMetric(analysisData.meta_description?.length)} characters</span>
                    <span class="tooltip">Recommended: 150-160 characters</span>
                </div>
                <div class="metric-item">
                    <span class="label">Description Text</span>
                    <span class="value">${analysisData.meta_description?.text || 'Not found'}</span>
                </div>
                <div class="metric-item">
                    <span class="label">Keyword Position</span>
                    <span class="value">${analysisData.meta_description?.keyword_position || 'Not found'}</span>
                </div>
            </div>
        `;

        // Display headings analysis with visual indicators
        const headingsAnalysis = document.querySelector('#headingsAnalysis .card-content');
        const h1Status = getMetricStatus(analysisData.headings?.h1_count, 1);
        headingsAnalysis.innerHTML = `
            <div class="metric-grid">
                <div class="metric-item ${h1Status}">
                    <span class="label">H1 Count</span>
                    <span class="value">${formatMetric(analysisData.headings?.h1_count, 'count')}</span>
                    <span class="tooltip">Recommended: 1 H1 tag per page</span>
                </div>
                <div class="metric-item">
                    <span class="label">H2 Count</span>
                    <span class="value">${formatMetric(analysisData.headings?.h2_count, 'count')}</span>
                </div>
                <div class="metric-item">
                    <span class="label">H3 Count</span>
                    <span class="value">${formatMetric(analysisData.headings?.h3_count, 'count')}</span>
                </div>
                <div class="metric-item">
                    <span class="label">Keyword in H1</span>
                    <span class="value">${analysisData.headings?.keyword_in_h1 ? 'Yes' : 'No'}</span>
                </div>
            </div>
        `;

        // Display content analysis with benchmarks
        const contentAnalysis = document.querySelector('#contentAnalysis .card-content');
        const wordCountStatus = getMetricStatus(analysisData.content?.word_count, analysisData.benchmarks?.word_count);
        const keywordDensityStatus = getMetricStatus(analysisData.content?.keyword_density, analysisData.benchmarks?.keyword_density);
        contentAnalysis.innerHTML = `
            <div class="metric-grid">
                <div class="metric-item ${wordCountStatus}">
                    <span class="label">Word Count</span>
                    <span class="value">${formatMetric(analysisData.content?.word_count, 'count')}</span>
                    <span class="tooltip">Benchmark: ${formatMetric(analysisData.benchmarks?.word_count, 'count')}</span>
                </div>
                <div class="metric-item ${keywordDensityStatus}">
                    <span class="label">Keyword Density</span>
                    <span class="value">${formatMetric(analysisData.content?.keyword_density, 'percentage')}</span>
                    <span class="tooltip">Benchmark: ${formatMetric(analysisData.benchmarks?.keyword_density, 'percentage')}</span>
                </div>
                <div class="metric-item">
                    <span class="label">Readability Score</span>
                    <span class="value">${formatMetric(analysisData.content?.readability_score)}</span>
                </div>
            </div>
        `;

        // Display links analysis with status indicators
        const linksAnalysis = document.querySelector('#linksAnalysis .card-content');
        const brokenLinksStatus = getMetricStatus(analysisData.links?.broken_count, 0, 'lower');
        linksAnalysis.innerHTML = `
            <div class="metric-grid">
                <div class="metric-item">
                    <span class="label">Internal Links</span>
                    <span class="value">${formatMetric(analysisData.links?.internal_count, 'count')}</span>
                </div>
                <div class="metric-item">
                    <span class="label">External Links</span>
                    <span class="value">${formatMetric(analysisData.links?.external_count, 'count')}</span>
                </div>
                <div class="metric-item ${brokenLinksStatus}">
                    <span class="label">Broken Links</span>
                    <span class="value">${formatMetric(analysisData.links?.broken_count, 'count')}</span>
                    <span class="tooltip">Should be 0</span>
                </div>
            </div>
        `;

        // Display images analysis with status indicators
        const imagesAnalysis = document.querySelector('#imagesAnalysis .card-content');
        const altTextStatus = getMetricStatus(analysisData.images?.with_alt_count, analysisData.images?.total_count);
        imagesAnalysis.innerHTML = `
            <div class="metric-grid">
                <div class="metric-item">
                    <span class="label">Total Images</span>
                    <span class="value">${formatMetric(analysisData.images?.total_count, 'count')}</span>
                </div>
                <div class="metric-item ${altTextStatus}">
                    <span class="label">Images with Alt</span>
                    <span class="value">${formatMetric(analysisData.images?.with_alt_count, 'count')}</span>
                    <span class="tooltip">All images should have alt text</span>
                </div>
                <div class="metric-item">
                    <span class="label">Images without Alt</span>
                    <span class="value">${formatMetric(analysisData.images?.without_alt_count, 'count')}</span>
                </div>
            </div>
        `;

        // Display schema analysis with status indicators
        const schemaAnalysis = document.querySelector('#schemaAnalysis .card-content');
        const schemaStatus = analysisData.schema?.is_valid ? 'good' : 'bad';
        schemaAnalysis.innerHTML = `
            <div class="metric-grid">
                <div class="metric-item ${schemaStatus}">
                    <span class="label">Schema Types</span>
                    <span class="value">${analysisData.schema?.types?.join(', ') || 'None found'}</span>
                    <span class="tooltip">${schemaStatus === 'good' ? 'Valid schema markup found' : 'No valid schema markup found'}</span>
                </div>
                <div class="metric-item">
                    <span class="label">Valid Schema</span>
                    <span class="value">${analysisData.schema?.is_valid ? 'Yes' : 'No'}</span>
                </div>
            </div>
        `;

        // Display technical analysis with status indicators
        const techAnalysis = document.querySelector('#techAnalysis .card-content');
        techAnalysis.innerHTML = `
            <div class="metric-grid">
                <div class="metric-item ${analysisData.technical?.mobile_responsive ? 'good' : 'bad'}">
                    <span class="label">Mobile Responsive</span>
                    <span class="value">${analysisData.technical?.mobile_responsive ? 'Yes' : 'No'}</span>
                    <span class="tooltip">${analysisData.technical?.mobile_responsive ? 'Page is mobile-friendly' : 'Page needs mobile optimization'}</span>
                </div>
                <div class="metric-item ${analysisData.technical?.ssl_enabled ? 'good' : 'bad'}">
                    <span class="label">SSL Enabled</span>
                    <span class="value">${analysisData.technical?.ssl_enabled ? 'Yes' : 'No'}</span>
                    <span class="tooltip">${analysisData.technical?.ssl_enabled ? 'Secure connection enabled' : 'SSL certificate not found'}</span>
                </div>
                <div class="metric-item">
                    <span class="label">Canonical URL</span>
                    <span class="value">${analysisData.technical?.canonical_url || 'Not set'}</span>
                </div>
            </div>
        `;

        // Display performance metrics with status indicators
        const performanceAnalysis = document.querySelector('#performanceAnalysis .card-content');
        const loadTimeStatus = getMetricStatus(analysisData.performance?.page_load_time, 3, 'lower');
        const fcpStatus = getMetricStatus(analysisData.performance?.first_contentful_paint, 1.8, 'lower');
        const ttiStatus = getMetricStatus(analysisData.performance?.time_to_interactive, 3.8, 'lower');
        performanceAnalysis.innerHTML = `
            <div class="metric-grid">
                <div class="metric-item ${loadTimeStatus}">
                    <span class="label">Page Load Time</span>
                    <span class="value">${formatMetric(analysisData.performance?.page_load_time, 'time')}</span>
                    <span class="tooltip">Recommended: < 3 seconds</span>
                </div>
                <div class="metric-item ${fcpStatus}">
                    <span class="label">First Contentful Paint</span>
                    <span class="value">${formatMetric(analysisData.performance?.first_contentful_paint, 'time')}</span>
                    <span class="tooltip">Recommended: < 1.8 seconds</span>
                </div>
                <div class="metric-item ${ttiStatus}">
                    <span class="label">Time to Interactive</span>
                    <span class="value">${formatMetric(analysisData.performance?.time_to_interactive, 'time')}</span>
                    <span class="tooltip">Recommended: < 3.8 seconds</span>
                </div>
            </div>
        `;

        // Display benchmarks with visual indicators
        const benchmarksDisplay = document.querySelector('#benchmarksDisplay .card-content');
        benchmarksDisplay.innerHTML = `
            <div class="metric-grid">
                <div class="metric-item">
                    <span class="label">Word Count Benchmark</span>
                    <span class="value">${formatMetric(analysisData.benchmarks?.word_count, 'count')}</span>
                </div>
                <div class="metric-item">
                    <span class="label">Keyword Density Benchmark</span>
                    <span class="value">${formatMetric(analysisData.benchmarks?.keyword_density, 'percentage')}</span>
                </div>
                <div class="metric-item">
                    <span class="label">Readability Benchmark</span>
                    <span class="value">${formatMetric(analysisData.benchmarks?.readability)}</span>
                </div>
            </div>
        `;

        // Display recommendations with severity indicators
        const recommendationsDisplay = document.querySelector('#recommendationsDisplay .card-content');
        if (Array.isArray(analysisData.recommendations)) {
            recommendationsDisplay.innerHTML = analysisData.recommendations
                .map(rec => `
                    <div class="recommendation sev-${(rec.severity || 'medium').toLowerCase()}">
                        <div class="rec-header">
                            <span class="rec-severity">${rec.severity || 'Medium'}</span>
                            <h4>${rec.title || 'Untitled Recommendation'}</h4>
                        </div>
                        <p class="rec-description">${rec.description || 'No description available'}</p>
                        ${rec.resource_link ? `
                            <a href="${rec.resource_link}" target="_blank" rel="noopener noreferrer" class="rec-link">
                                Learn more
                            </a>
                        ` : ''}
                    </div>
                `)
                .join('');
        } else {
            recommendationsDisplay.innerHTML = '<p>No recommendations available</p>';
        }

        // Display competitor summary with visual indicators
        const competitorSummary = document.querySelector('#competitorSummary .card-content');
        if (Array.isArray(data.competitor_analysis_summary) && data.competitor_analysis_summary.length > 0) {
            competitorSummary.innerHTML = `
                <div class="competitor-grid">
                    ${data.competitor_analysis_summary.map(comp => `
                        <div class="competitor-card">
                            <div class="comp-url">${comp.url || 'N/A'}</div>
                            <div class="comp-metrics">
                                <div class="metric-item">
                                    <span class="label">Title Length</span>
                                    <span class="value">${formatMetric(comp.title_length)}</span>
                                </div>
                                <div class="metric-item">
                                    <span class="label">Word Count</span>
                                    <span class="value">${formatMetric(comp.word_count, 'count')}</span>
                                </div>
                                <div class="metric-item">
                                    <span class="label">Keyword Density</span>
                                    <span class="value">${formatMetric(comp.keyword_density, 'percentage')}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
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
    } catch (error) {
        console.error('Error displaying results:', error);
        showError('Error processing the analysis results. Please try again.');
    }
} 