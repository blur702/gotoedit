chrome.runtime.onInstalled.addListener(() => {
  fetchAndStoreMembersData();
});

function fetchAndStoreMembersData() {
  fetch('https://member-info.house.gov/members.xml')
    .then(response => response.text())
    .then(str => new DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      const members = Array.from(data.querySelectorAll('member')).map(member => {
        const memberInfo = {};
        for (const child of member.children) {
          memberInfo[child.tagName] = child.textContent;
        }
        return memberInfo;
      });
      chrome.storage.local.set({ 'membersData': members });
    })
    .catch(error => console.error('Error fetching or parsing members data:', error));
}
