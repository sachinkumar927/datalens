// === Statistical functions ===
function numericStats(values) {
    const nums = values.map(v => toNumberSafe(v)).filter(v => v !== null);
    if (!nums.length) return { count: 0, min: null, max: null, avg: null, median: null, stdDev: null, q1: null, q3: null, unique: 0, sum: null, range: null, variance: null, iqr: null, outliers: [], sampleValues: [] };
    nums.sort((a, b) => a - b);
    const count = nums.length;
    const min = nums[0], max = nums[nums.length - 1];
    const sum = nums.reduce((s, x) => s + x, 0);
    const avg = sum / count;
    const median = (count % 2 === 1) ? nums[(count - 1) / 2] : (nums[count / 2 - 1] + nums[count / 2]) / 2;
    const unique = new Set(nums).size;

    // Standard deviation
    const variance = nums.reduce((s, x) => s + Math.pow(x - avg, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    // Quartiles
    const q1Index = Math.floor(count * 0.25);
    const q3Index = Math.floor(count * 0.75);
    const q1 = nums[q1Index];
    const q3 = nums[q3Index];
    const iqr = q3 - q1;

    // Outliers (IQR method)
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = nums.filter(n => n < lowerBound || n > upperBound);

    // Sample values
    const sampleValues = nums.slice(0, 10);

    return { count, min, max, sum, avg, median, stdDev, q1, q3, unique, range: max - min, variance, iqr, outliers: outliers.length, sampleValues };
}

function textStats(values) {
    const texts = values.filter(v => v !== null && v !== undefined && v !== "").map(v => String(v));
    if (!texts.length) return { count: 0, minLength: null, maxLength: null, avgLength: null, mostFrequent: null, top5: [], patternPercentages: {} };

    const lengths = texts.map(t => t.length);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    const avgLength = lengths.reduce((s, l) => s + l, 0) / lengths.length;

    // Most frequent value
    const freq = {};
    texts.forEach(t => freq[t] = (freq[t] || 0) + 1);
    const mostFrequent = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);

    // Top 5 frequent values
    const top5 = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([val, count]) => ({ value: val, count, percentage: (count / texts.length * 100).toFixed(2) }));

    // Pattern percentages
    const patterns = { numeric: 0, alphabetic: 0, alphanumeric: 0, special: 0 };
    texts.forEach(t => {
        if (/^\d+$/.test(t)) patterns.numeric++;
        else if (/^[a-zA-Z]+$/.test(t)) patterns.alphabetic++;
        else if (/^[a-zA-Z0-9]+$/.test(t)) patterns.alphanumeric++;
        else patterns.special++;
    });
    const total = texts.length;
    Object.keys(patterns).forEach(k => patterns[k] = (patterns[k] / total * 100).toFixed(2));

    return { count: texts.length, minLength, maxLength, avgLength: avgLength.toFixed(2), mostFrequent, top5, patternPercentages: patterns };
}

function dateStats(values) {
    const dates = values.filter(v => v !== null && v !== undefined && v !== "").map(v => new Date(v)).filter(d => !isNaN(d.valueOf()));
    if (!dates.length) return { count: 0, minDate: null, maxDate: null, dateRange: null, mostFrequent: null, yearMonthDist: {} };

    dates.sort((a, b) => a - b);
    const minDate = dates[0].toISOString().split('T')[0];
    const maxDate = dates[dates.length - 1].toISOString().split('T')[0];
    const dateRange = Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24));

    // Most frequent date
    const freq = {};
    dates.forEach(d => {
        const key = d.toISOString().split('T')[0];
        freq[key] = (freq[key] || 0) + 1;
    });
    const mostFrequent = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);

    // Year/Month distribution
    const yearMonthDist = {};
    dates.forEach(d => {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        yearMonthDist[key] = (yearMonthDist[key] || 0) + 1;
    });

    return { count: dates.length, minDate, maxDate, dateRange, mostFrequent, yearMonthDist };
}

function dataTypeDominance(values) {
    const counts = { numeric: 0, string: 0, date: 0, boolean: 0, null: 0 };
    const total = values.length;
    values.forEach(v => {
        if (v === null || v === undefined || v === "") counts.null++;
        else if (typeof v === 'boolean' || isBooleanLike(v)) counts.boolean++;
        else if (isNumberLike(v)) counts.numeric++;
        else if (isDateString(v)) counts.date++;
        else counts.string++;
    });
    const percentages = {};
    Object.keys(counts).forEach(k => percentages[k] = (counts[k] / total * 100).toFixed(2));
    const dominant = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    const confidence = percentages[dominant];
    return { ...percentages, dominant, confidence };
}

function valueCounts(values) {
    const freq = {};
    values.forEach(v => {
        const key = v === null || v === undefined ? 'null' : String(v);
        freq[key] = (freq[key] || 0) + 1;
    });
    return Object.entries(freq).map(([value, count]) => ({
        value,
        count,
        percentage: (count / values.length * 100).toFixed(2)
    })).sort((a, b) => b.count - a.count);
}
