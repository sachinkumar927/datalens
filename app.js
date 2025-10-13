// Load header and footer dynamically
async function includeHTML() {
    const header = await fetch('component/header.html');
    document.getElementById('header').innerHTML = await header.text();

    const footer = await fetch('component/footer.html');
    document.getElementById('footer').innerHTML = await footer.text();

    const guide = await fetch('component/guide.html');
    document.getElementById('guide').innerHTML = await guide.text();
}
includeHTML();
