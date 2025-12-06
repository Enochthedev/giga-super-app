// Remove duplicate taxi endpoint sections from Postman Collection
const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('./Giga-API-Collection.postman_collection.json', 'utf8'));

// Section names to check for duplicates
const duplicateNames = [
    '11. Taxi/Ride Service - Riders',
    '12. Taxi/Ride Service - Drivers',
    '13. Platform Settings (Admin)'
];

// Remove duplicates - keep only the first occurrence
duplicateNames.forEach(name => {
    let found = false;
    collection.item = collection.item.filter(item => {
        if (item.name === name) {
            if (found) {
                console.log(`🗑️  Removing duplicate: ${name}`);
                return false; // Remove this duplicate
            }
            found = true;
            return true; // Keep first occurrence
        }
        return true; // Keep all other items
    });
});

// Write updated collection
fs.writeFileSync('./Giga-API-Collection.postman_collection.json', JSON.stringify(collection, null, 2));

console.log('✅ Duplicates removed successfully!');
