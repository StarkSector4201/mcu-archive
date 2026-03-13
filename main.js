document.addEventListener('DOMContentLoaded', () => {
    const movieGrid = document.getElementById('movieGrid');
    const heroBg = document.getElementById('heroBg');
    const filterButtons = document.querySelectorAll('.hero-actions .filter-btn');
    const phaseButtons = document.querySelectorAll('#phaseFilters .filter-btn');
    
    let mcuData = [];
    let currentFilter = 'all';
    let currentPhase = 'all';

    // Set Hero Background from the generated image
    // Note: I'll use the relative path or base64 if I had it, 
    // but for now I'll apply a placeholder or the specific filename if I can reference it.
    // Given the environment, I'll use a direct reference to the generated image file.
    const heroImagePath = 'mcu_hero_background_cinematic_1773397520929.png'; // Assuming it's in the same dir for now or accessible
    // In a real scenario, we'd ensure the image is in the webapp assets folder.
    // I will copy it there in the next step.

    async function loadData() {
        try {
            const response = await fetch('data.json');
            mcuData = await response.json();
            renderGrid();
        } catch (error) {
            console.error('Error loading MCU data:', error);
        }
    }

    function renderGrid() {
        movieGrid.innerHTML = '';
        
        const filtered = mcuData.filter(item => {
            const typeMatch = currentFilter === 'all' || item.type === currentFilter;
            const phaseMatch = currentPhase === 'all' || item.phase.toString() === currentPhase;
            return typeMatch && phaseMatch;
        });

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.style.backgroundImage = `url(${item.poster})`;
            card.style.backgroundSize = 'cover';
            card.style.backgroundPosition = 'center';
            
            card.innerHTML = `
                <div class="card-content">
                    <p class="card-meta">PHASE ${item.phase} | ${item.year}</p>
                    <h3 class="card-title">${item.title}</h3>
                </div>
            `;
            
            card.onclick = () => showDetails(item);
            movieGrid.appendChild(card);
        });
    }

    function showDetails(item) {
        // Implement modal or detail view logic here
        console.log('Viewing details for:', item.title);
        // For now, let's just log it. A full modal can be added in the polish phase.
    }

    // Type Filters
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderGrid();
        });
    });

    // Phase Filters
    phaseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            phaseButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPhase = btn.dataset.phase;
            renderGrid();
        });
    });

    loadData();
});
