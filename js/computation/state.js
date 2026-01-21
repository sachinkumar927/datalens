// === App state ===
let fullData = [];            // array of objects (records)
let filteredView = [];        // after search/filter
let schema = {};              // field -> meta with all computations
let currentPage = 1;
let rowsPerPage = 10;
let visibleTables = { summary: true, overview: true, numeric: true, text: true, date: true, values: true }; // for hide/show
let selectedValueCountsField = ''; // for value counts field selection
let currentPageValueCounts = 1;
let rowsPerPageValueCounts = 10;

// sample dataset
const sampleData = [
    { id: 1, name: "Alice", age: 34, city: "Bangalore", active: true, joinDate: "2022-02-10" },
    { id: 2, name: "Bob", age: 29, city: "Mumbai", active: false, joinDate: "2021-08-22" },
    { id: 3, name: "Charlie", age: 41, city: "Delhi", active: true, joinDate: "2020-12-15" },
    { id: 4, name: "Diana", age: null, city: "Chennai", active: false, joinDate: "2023-01-05" },
    { id: 5, name: "Eve", age: 27, city: "Bangalore", active: true, joinDate: "2022-06-03" },
    { id: 6, name: "Frank", age: 50, city: "Hyderabad", active: true, joinDate: "2019-03-11" },
    { id: 7, name: "Gita", age: 38, city: "Mumbai", active: false, joinDate: "2018-11-28" },
    { id: 8, name: "Hari", age: 45, city: "Bangalore", active: true, joinDate: "2020-04-30" },
    { id: 9, name: "Isha", age: null, city: "Chennai", active: false, joinDate: "2021-01-19" },
    { id: 10, name: "Jay", age: 32, city: "Delhi", active: true, joinDate: "2022-09-09" },
    { id: 11, name: "Kiran", age: 26, city: "Bangalore", active: true, joinDate: "2022-07-21" },
    { id: 12, name: "Leena", age: 31, city: "Pune", active: false, joinDate: "2020-10-10" },
    { id: 13, name: "Mohan", age: 39, city: "Mumbai", active: true, joinDate: "2019-05-02" },
    { id: 14, name: "Nina", age: 28, city: "Hyderabad", active: false, joinDate: "2021-12-12" },
    { id: 15, name: "Omar", age: 44, city: "Chennai", active: true, joinDate: "2017-07-07" }
];

// Handy selectors
const el = id => document.getElementById(id);
