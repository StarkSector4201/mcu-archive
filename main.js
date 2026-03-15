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
                <div class="card-badge phase-badge">PHASE ${item.phase}</div>
                <div class="card-badge year-badge">${item.year}</div>
                <div class="card-content">
                    <h3 class="card-title">${item.title}</h3>
                    <div class="card-hover-hint">PLAY NOW ></div>
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
        
        const videoContainer = document.getElementById('videoPlayerContainer');
        const videoPlayer = document.getElementById('mainVideo');

        // Reset Player State
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.src = "";
            videoContainer.style.display = 'none';
            modalPoster.style.display = 'block';
        }

        // Subtitle Selection Function
        function updateSubtitles(src) {
            const tracks = videoPlayer.querySelectorAll('track');
            tracks.forEach(t => t.remove());

            if (src) {
                const track = document.createElement('track');
                track.kind = "subtitles";
                track.label = "Arabic";
                track.srclang = "ar";
                track.src = src;
                track.default = true;
                videoPlayer.appendChild(track);
            }
        }

        const subOptions = document.querySelectorAll('.sub-option');
        subOptions.forEach(opt => {
            opt.onclick = () => {
                subOptions.forEach(s => s.classList.remove('active'));
                opt.classList.add('active');
                if (videoPlayer && videoPlayer.src) {
                    const isArabic = opt.innerText.includes('العربية');
                    updateSubtitles(isArabic ? item.subtitle_ar : null);
                }
            };
        });

        modalWatchBtn.onclick = (e) => {
            e.preventDefault();
            const telegramLink = item.telegram_link;
            const watchLink = item.watch_link;
            const finalLink = telegramLink || watchLink || "#";
            
            const streamLink = [watchLink, telegramLink].find(l => l && (l.includes('.mp4') || l.includes('.mkv') || l.includes('.webm')));
            
            if (streamLink) {
                modalPoster.style.display = 'none';
                videoContainer.style.display = 'flex';
                videoPlayer.src = streamLink;

                const activeSub = document.querySelector('.sub-option.active');
                if (activeSub && activeSub.innerText.includes('العربية')) {
                    updateSubtitles(item.subtitle_ar);
                }

                videoPlayer.play().catch(err => {
                    window.open(streamLink, '_blank');
                });
                return false;
            }

            if (window.Telegram && window.Telegram.WebApp && finalLink !== "#") {
                window.Telegram.WebApp.openLink(finalLink);
                return false;
            }

            if (finalLink !== "#") {
                window.open(finalLink, '_blank');
            }
            
            return false;
        };
        modalWatchBtn.href = "#";

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

    function stopVideo() {
        const videoPlayer = document.getElementById('mainVideo');
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.src = "";
        }
    }

    // Modal Closing Logic
    if (closeModal) {
        closeModal.onclick = () => {
            stopVideo();
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            stopVideo();
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

    // --- STARK DASHBOARD LOGIC ---
    class StarkDashboard {
        constructor() {
            this.modal = document.getElementById('starkDashboard');
            this.authPanel = document.getElementById('adminAuth');
            this.panel = document.getElementById('adminPanel');
            this.tokenInput = document.getElementById('ghToken');
            this.authBtn = document.getElementById('authBtn');
            this.commitBtn = document.getElementById('commitBtn');
            this.adminGrid = document.getElementById('adminMovieGrid');
            this.closeBtn = document.querySelector('.close-admin');
            
            this.repoOwner = 'StarkSector4201';
            this.repoName = 'mcu-archive';
            this.filePath = 'webapp/data.json';
            this.token = localStorage.getItem('stark_token') || '';
            this.fileSha = '';
            
            this.init();
        }

        init() {
            if (this.token) this.tokenInput.value = this.token;
            
            this.authBtn.onclick = () => this.authorize();
            this.commitBtn.onclick = () => this.commitChanges();
            
            if (this.closeBtn) {
                this.closeBtn.onclick = () => this.modal.style.display = 'none';
            }
            
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('mode') === 'stark') {
                this.modal.style.display = 'block';
                if (this.token) this.authorize();
            }
        }

        async authorize() {
            this.token = this.tokenInput.value.trim();
            if (!this.token) return alert("Soldier, I need a token to access the archives.");
            
            localStorage.setItem('stark_token', this.token);
            this.authBtn.innerText = "AUTHORIZING...";
            
            try {
                const response = await fetch(`https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.filePath}`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
                
                if (!response.ok) throw new Error("Invalid Token or Repository Access Restricted.");
                
                const fileData = await response.json();
                this.fileSha = fileData.sha;
                
                this.authPanel.style.display = 'none';
                this.panel.style.display = 'flex';
                this.renderAdminMovies();
                
            } catch (error) {
                alert(`Tactical Error: ${error.message}`);
                this.authBtn.innerText = "AUTHORIZE";
            }
        }

        renderAdminMovies() {
            this.adminGrid.innerHTML = '';
            mcuData.forEach((movie, index) => {
                const item = document.createElement('div');
                item.className = 'admin-movie-item';
                item.innerHTML = `
                    <img src="${proxyImage(movie.poster)}" class="admin-thumb">
                    <div class="admin-edit-form">
                        <div class="admin-field" style="grid-column: span 2;">
                            <label>TITLE</label>
                            <input type="text" value="${movie.title}" disabled>
                        </div>
                        <div class="admin-field">
                            <label>WATCH LINK (MP4/TELEGRAM)</label>
                            <input type="text" class="edit-link" data-index="${index}" value="${movie.watch_link || ''}">
                        </div>
                        <div class="admin-field">
                            <label>ARABIC SUBTITLES (.SRT)</label>
                            <input type="text" class="edit-sub" data-index="${index}" value="${movie.subtitle_ar || ''}">
                        </div>
                    </div>
                `;
                this.adminGrid.appendChild(item);
            });
        }

        async commitChanges() {
            const links = document.querySelectorAll('.edit-link');
            const subs = document.querySelectorAll('.edit-sub');
            
            links.forEach(input => {
                const idx = input.dataset.index;
                mcuData[idx].watch_link = input.value.trim();
            });
            subs.forEach(input => {
                const idx = input.dataset.index;
                mcuData[idx].subtitle_ar = input.value.trim();
            });

            this.commitBtn.disabled = true;
            this.commitBtn.innerText = "COMMITTING...";

            try {
                const content = btoa(unescape(encodeURIComponent(JSON.stringify(mcuData, null, 4))));
                const response = await fetch(`https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.filePath}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: "Tactical Update: Synchronizing Hub Database",
                        content: content,
                        sha: this.fileSha
                    })
                });

                if (!response.ok) throw new Error("Commit Protocol Failed.");
                
                const result = await response.json();
                this.fileSha = result.content.sha;
                alert("Mission Success: Hub database updated. Changes will be live in 60 seconds.");
                this.commitBtn.innerText = "COMMIT CHANGES";
                this.commitBtn.disabled = false;
                
            } catch (error) {
                alert(`Deployment Failed: ${error.message}`);
                this.commitBtn.innerText = "COMMIT CHANGES";
                this.commitBtn.disabled = false;
            }
        }
    }

    const dashboard = new StarkDashboard();
    loadData();
});
