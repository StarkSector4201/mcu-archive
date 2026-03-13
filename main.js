document.addEventListener('DOMContentLoaded', () => {
    const movieGrid = document.getElementById('movieGrid');
    const heroBg = document.getElementById('heroBg');
    const filterButtons = document.querySelectorAll('.hero-actions .filter-btn');
    const phaseButtons = document.querySelectorAll('#phaseFilters .filter-btn');
    
    // Modal Elements
    const modal = document.getElementById('movieModal');
    const closeModal = document.querySelector('.close-modal');
    const modalPoster = document.getElementById('modalPoster');
    const modalTitle = document.getElementById('modalTitle');
    const modalYearPhase = document.getElementById('modalYearPhase');
    const modalSynopsis = document.getElementById('modalSynopsis');
    const modalWatchBtn = document.getElementById('modalWatchBtn');
    const characterGrid = document.getElementById('characterGrid');

    let mcuData = [];
    let currentFilter = 'all';
    let currentPhase = 'all';

    async function loadData() {
        try {
            const response = await fetch('data.json');
            mcuData = await response.json();
            renderGrid();
        } catch (error) {
            console.error('Error loading MCU data:', error);
        }
    }

    function proxyImage(url) {
        if (!url) return '';
        // If it's a local file or already proxied, return as is
        if (url.startsWith('mcu_') || url.includes('images.weserv.nl')) return url;
        // Proxy all external images to avoid hotlinking/CORB issues
        if (url.startsWith('http')) {
            return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&default=https://raw.githubusercontent.com/StarkSector4201/mcu-archive/main/webapp/mcu_hero.png`;
        }
        return url;
    }

    function renderGrid() {
        if (!movieGrid) return;
        movieGrid.innerHTML = '';
        
        const filtered = mcuData.filter(item => {
            const typeMatch = currentFilter === 'all' || item.type === currentFilter;
            const phaseMatch = currentPhase === 'all' || item.phase.toString() === currentPhase;
            return typeMatch && phaseMatch;
        });

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card loading';
            const proxiedPoster = proxyImage(item.poster);
            
            // Create an image object to check for loading/error
            const img = new Image();
            img.src = proxiedPoster;
            img.onload = () => {
                card.classList.remove('loading');
                card.style.backgroundImage = `url("${proxiedPoster}")`;
            };
            img.onerror = () => {
                card.classList.remove('loading');
                card.classList.add('image-error');
                card.innerHTML += `<div class="error-overlay">SIGNAL LOST</div>`;
            };
            
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
        if (!modal) return;
        
        modalTitle.innerText = item.title;
        modalYearPhase.innerText = `PHASE ${item.phase} | ${item.year}`;
        modalSynopsis.innerText = item.synopsis || "Strategic intelligence gathering in progress for this mission...";
        
        // Handle Modal Poster Fallback
        modalPoster.src = '';
        modalPoster.classList.add('loading');
        const mainImg = new Image();
        mainImg.src = proxyImage(item.poster);
        mainImg.onload = () => {
            modalPoster.classList.remove('loading');
            modalPoster.src = mainImg.src;
        };
        mainImg.onerror = () => {
            modalPoster.classList.remove('loading');
            modalPoster.src = 'mcu_hero.png'; // Fallback to hero image
        };
        
        modalWatchBtn.href = item.watch_link || "#";

        // Render Character Cards
        characterGrid.innerHTML = '';
        if (item.characters && item.characters.length > 0) {
            item.characters.forEach(char => {
                const charCard = document.createElement('div');
                charCard.className = 'char-card';
                const charImgSrc = proxyImage(char.img);
                
                charCard.innerHTML = `
                    <div class="char-img-container">
                        <img src="${charImgSrc}" alt="${char.name}" class="char-img" onerror="this.src='mcu_hero.png';this.parentElement.classList.add('img-fail');">
                    </div>
                    <span class="char-name">${char.name}</span>
                    <span class="char-role">${char.role}</span>
                    <span class="char-actor">${char.actor}</span>
                `;
                characterGrid.appendChild(charCard);
            });
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Modal Closing Logic
    if (closeModal) {
        closeModal.onclick = () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };

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
