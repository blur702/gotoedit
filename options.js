document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const officeNameInput = document.getElementById('officeName');
    const publicUrl1Input = document.getElementById('publicUrl1');
    const publicUrl2Input = document.getElementById('publicUrl2');
    const editUrlInput = document.getElementById('editUrl');
    const urlsTableBody = document.querySelector('#urls-table tbody');

    // Load and display saved URLs
    const loadUrls = () => {
        chrome.storage.local.get({ urls: [] }, (result) => {
            const urls = result.urls;
            urlsTableBody.innerHTML = '';
            urls.forEach((url, index) => {
                const row = `<tr>
                    <td>${url.officeName}</td>
                    <td>${url.publicUrl1}</td>
                    <td>${url.publicUrl2 || ''}</td>
                    <td>${url.editUrl}</td>
                    <td><button class="delete-btn" data-index="${index}">Delete</button></td>
                </tr>`;
                urlsTableBody.innerHTML += row;
            });
        });
    };

    // Save a new URL mapping
    saveBtn.addEventListener('click', () => {
        const officeName = officeNameInput.value.trim();
        const publicUrl1 = publicUrl1Input.value.trim();
        const publicUrl2 = publicUrl2Input.value.trim();
        const editUrl = editUrlInput.value.trim();

        if (!officeName || !publicUrl1 || !editUrl) {
            alert('Please fill in all required fields (Office Name, Public URL 1, and Edit URL).');
            return;
        }

        chrome.storage.local.get({ urls: [] }, (result) => {
            const urls = result.urls;
            const newUrl = { officeName, publicUrl1, publicUrl2, editUrl };
            urls.push(newUrl);
            chrome.storage.local.set({ urls }, () => {
                loadUrls();
                // Clear input fields
                officeNameInput.value = '';
                publicUrl1Input.value = '';
                publicUrl2Input.value = '';
                editUrlInput.value = '';
            });
        });
    });

    // Delete a URL mapping
    urlsTableBody.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const index = parseInt(event.target.getAttribute('data-index'), 10);
            chrome.storage.local.get({ urls: [] }, (result) => {
                const urls = result.urls;
                urls.splice(index, 1);
                chrome.storage.local.set({ urls }, loadUrls);
            });
        }
    });

    // Initial load of URLs
    loadUrls();
});