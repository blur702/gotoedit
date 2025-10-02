import os
import re
import time
from playwright.sync_api import sync_playwright, expect

def test_extension_options_page():
    # Get the absolute path to the extension
    extension_path = os.path.abspath('.')

    with sync_playwright() as p:
        # Launch a persistent context with the extension loaded in headless mode
        context = p.chromium.launch_persistent_context(
            '',  # Empty user data dir for a clean profile
            headless=True,
            args=[
                f'--disable-extensions-except={extension_path}',
                f'--load-extension={extension_path}',
            ]
        )

        # Create a new page and navigate to a URL that will trigger the background script
        page = context.new_page()
        page.goto('https://www.house.gov')

        # Give the service worker time to initialize
        time.sleep(2)

        # Find the extension's ID from the service worker
        background_page = None
        for worker in context.service_workers:
            if "background.js" in worker.url:
                background_page = worker
                break

        if not background_page:
            context.close()
            raise Exception("Could not find the extension's background service worker. The manifest may be missing the background service worker definition, or the trigger page failed to activate it.")

        extension_id_match = re.search(r'chrome-extension://([a-z]+)', background_page.url)
        if not extension_id_match:
            context.close()
            raise Exception("Could not extract the extension ID from the background worker URL.")

        extension_id = extension_id_match.group(1)

        # Close the trigger page
        page.close()

        # Navigate to the options page
        options_page = context.new_page()
        options_page.goto(f'chrome-extension://{extension_id}/options.html')

        # Verify the title of the options page
        expect(options_page).to_have_title("Go To Edit Options")

        # Fill out the form
        options_page.fill('#officeName', 'Test Office')
        options_page.fill('#publicUrl1', 'test.house.gov')
        options_page.fill('#publicUrl2', 'anothertest.house.gov')
        options_page.fill('#editUrl', 'edit-test.house.gov')

        # Click the save button
        options_page.click('#save-btn')

        # Verify the data was added to the table
        expect(options_page.locator('table tbody tr')).to_have_count(1)
        expect(options_page.locator('td:has-text("Test Office")')).to_be_visible()

        # Take a screenshot
        options_page.screenshot(path='jules-scratch/verification/verification.png')

        context.close()

if __name__ == '__main__':
    test_extension_options_page()