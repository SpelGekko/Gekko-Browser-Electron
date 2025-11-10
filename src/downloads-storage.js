const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const downloadsFilePath = path.join(app.getPath('userData'), 'downloads.json');
let downloads = [];

function ensureDownloadsFile() {
    if (!fs.existsSync(downloadsFilePath)) {
        fs.writeFileSync(downloadsFilePath, JSON.stringify([]));
    }
}

function loadDownloads() {
    try {
        const data = fs.readFileSync(downloadsFilePath, 'utf-8');
        downloads = JSON.parse(data);
    } catch (error) {
        console.error('Error loading downloads, initializing with empty array:', error);
        downloads = [];
    }
}

function saveDownloads() {
    fs.writeFileSync(downloadsFilePath, JSON.stringify(downloads, null, 2));
}

function addDownload(downloadInfo) {
    // Check if a download with the same startTime already exists to prevent duplicates
    const existingIndex = downloads.findIndex(d => d.startTime === downloadInfo.startTime);
    if (existingIndex > -1) {
        // Update existing download
        downloads[existingIndex] = { ...downloads[existingIndex], ...downloadInfo };
    } else {
        // Add new download
        downloads.unshift(downloadInfo);
    }
    saveDownloads();
}

function getDownloads() {
    loadDownloads();
    return downloads;
}

function clearDownloads() {
    downloads = [];
    saveDownloads();
}

module.exports = {
    ensureDownloadsFile,
    addDownload,
    getDownloads,
    clearDownloads,
};
