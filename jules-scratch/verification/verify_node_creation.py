
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5173/")

    # Click the "+ Add Node" button
    page.click("text=+ Add Node")

    # Wait for the form to be visible
    page.wait_for_selector("#node-title")

    # Fill in the form
    page.fill("#node-title", "Test Node")
    page.fill("#node-tags", "CS1234")
    page.fill('input[type="url"]', "https://example.com")
    page.fill('input[placeholder="Key (e.g., ISBN)"]', "TestKey")
    page.fill('input[placeholder="Value"]', "TestValue")

    # Use a more specific selector for the submit button
    submit_button = page.locator('form button[type="submit"]:has-text("Add")')
    submit_button.click()

    # Wait for the new node to appear (adjust selector as needed)
    page.wait_for_selector("text=Test Node")

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
