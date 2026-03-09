document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    fetchGallery();
});

let currentSlide = 0;
let totalSlides = 0;

async function fetchGallery() {
    const container = document.getElementById('gallery-container');
    
    try {
        const response = await fetch('/api/gallery');
        const result = await response.json();
        
        if (result.message === 'success') {
            renderGallery(result.data, container);
        } else {
            container.innerHTML = `<p style="color: var(--error);">Error al cargar galería.</p>`;
        }
    } catch (error) {
        console.error("Fetch gallery error:", error);
    }
}

function renderGallery(images, container) {
    const dotsContainer = document.getElementById('carousel-dots');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (images.length === 0) {
        container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; width: 100%; padding: 2rem;">No hay fotos recientes.</p>`;
        dotsContainer.style.display = 'none';
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        return;
    }

    totalSlides = images.length;
    container.innerHTML = '';
    dotsContainer.innerHTML = '';
    
    images.forEach((img, index) => {
        // Create slide
        const div = document.createElement('div');
        div.className = 'gallery-item';
        
        let slideHTML = `<img src="${img.image_url}" alt="Foto galería" loading="lazy">`;
        if (img.description) {
            slideHTML += `<div class="caption-overlay">${img.description}</div>`;
        }
        
        div.innerHTML = slideHTML;
        container.appendChild(div);

        // Create dot
        const dot = document.createElement('div');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });

    if (totalSlides <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        dotsContainer.style.display = 'none';
    } else {
        prevBtn.addEventListener('click', () => {
            currentSlide = (currentSlide > 0) ? currentSlide - 1 : totalSlides - 1;
            updateCarousel();
        });
        
        nextBtn.addEventListener('click', () => {
            currentSlide = (currentSlide < totalSlides - 1) ? currentSlide + 1 : 0;
            updateCarousel();
        });

        // Auto slide every 5 seconds
        setInterval(() => {
            currentSlide = (currentSlide < totalSlides - 1) ? currentSlide + 1 : 0;
            updateCarousel();
        }, 5000);
    }
}

function goToSlide(index) {
    currentSlide = index;
    updateCarousel();
}

function updateCarousel() {
    const container = document.getElementById('gallery-container');
    const dots = document.querySelectorAll('.dot');
    
    container.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    dots.forEach((dot, index) => {
        if (index === currentSlide) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// === Post Logic ===

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    
    try {
        const response = await fetch('/api/posts');
        const result = await response.json();
        
        if (result.message === 'success') {
            renderPosts(result.data, container);
        } else {
            container.innerHTML = `<p style="color: var(--error); text-align: center;">Error al cargar: ${result.error}</p>`;
        }
    } catch (error) {
        container.innerHTML = `<p style="color: var(--error); text-align: center;">Error de conexión.</p>`;
        console.error("Fetch error:", error);
    }
}

function renderPosts(posts, container) {
    if (posts.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No hay noticias publicadas aún.</p>`;
        return;
    }

    container.innerHTML = ''; // Clear loader
    
    posts.forEach((post, index) => {
        const card = document.createElement('article');
        card.className = 'post-card';
        // Add staggering animation delay
        card.style.animationDelay = `${index * 0.1}s`;

        // The date from PostgreSQL is already parsed into a valid ISO string by the driver
        const date = new Date(post.created_at); 
        const formattedDate = date.toLocaleString('es-ES', { 
            dateStyle: 'long', 
            timeStyle: 'short'  
        });

        // Media section
        let mediaHtml = '';
        if (post.media_url) {
            if (post.media_type === 'image') {
                mediaHtml = `<div class="post-media"><img src="${post.media_url}" alt="Adjunto" loading="lazy"></div>`;
            } else if (post.media_type === 'video') {
                mediaHtml = `
                <div class="post-media">
                    <video controls preload="metadata">
                        <source src="${post.media_url}" type="video/mp4">
                        Tu navegador no soporta videos.
                    </video>
                </div>`;
            }
        }
        
        let linkHtml = '';
        if (post.news_link) {
            const sourceName = post.news_source ? escapeHTML(post.news_source) : 'el Medio Oficial';
            linkHtml = `
            <div style="margin-top: 1.5rem; text-align: right;">
                <a href="${post.news_link}" target="_blank" rel="noopener noreferrer" class="btn btn-news">Leer Noticia en ${sourceName} &rarr;</a>
            </div>`;
        }

        card.innerHTML = `
            <div class="post-header">
                <h3 class="post-title">${escapeHTML(post.title)}</h3>
                <div class="post-meta">${formattedDate}</div>
            </div>
            <div class="post-content">${escapeHTML(post.content)}</div>
            ${mediaHtml}
            ${linkHtml}
        `;
        
        container.appendChild(card);
    });
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}
