// Create variable to hold db connection
let db;

// Establish a connection to IndexedDB database called 'budget' and set it to version 1
const request = indexedDB.open('budget', 1);

// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
    // save a reference to the database
    const db = event.target.result;
    // create an object store (table) called `budget`, set it to have an auto incrementing primary key of sorts
    db.createObjectStore('new_budget_transaction', { autoIncrement: true });
};

// Upon a successful
request.onsuccess = function (event) {
    // when db is successfully created with its object store (from onupgradedneeded event above) or simply established a connection, save reference to db in global variable
    db = event.target.result;

    // check if app is online, if yes run uploadBudget() function to send all local db data to api
    if (navigator.onLine) {
        uploadBudget();
    }
};

request.onerror = function (event) {
    // Log error here
    console.log(event.target.errorCode);
};

// This function will be executed if we attempt to submit a new budget transaction and there's no internet connection
function saveRecord(record) {
    // open a new transaction with the database with read and write permissions
    const transaction = db.transaction(['new_budget_transaction'], 'readwrite');

    // access the object store for 'new_budget_transaction'
    const budgetObjectStore = transaction.objectStore('new_budget_transaction');

    // Add record to your store with add method
    budgetObjectStore.add(record);
}

function uploadBudget() {
    // Open a transaction on your db
    const transaction = db.transaction(['new_budget_transaction'], 'readwrite');

    // Access your object store
    const budgetObjectStore = transaction.objectStore('new_budget_transaction');

    // Get all records from store and set to a variable
    const getAll = budgetObjectStore.getAll();

    // upon a successful .getAll() execution, run this function
    getAll.onsuccess = function () {
        // if there was data in indexedDb's store, let's send it to the api server
        if (getAll.result.length > 0) {
            fetch('/api/transaction', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(serverResponse => {
                    if (serverResponse.message) {
                        throw new Error(serverResponse);
                    }
                    // Open on more transaction
                    const transaction = db.transaction(['new_budget_transaction'], 'readwrite');

                    // Access the new_budget_transaction object store
                    const budgetObjectStore = transaction.objectStore('new_budget_transaction');

                    // Clear all items in your store
                    budgetObjectStore.clear();

                    alert('All saved budget transactions have been submitted!');
                })
                .catch(err => {
                    console.log(err);
                });
        }
    };

};

// listen for app coming back online
window.addEventListener('online', uploadBudget);