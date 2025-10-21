import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://localhost:5173/graph-visualization/")

        # Click the add node button
        await page.get_by_role("button", name="+ Add Node").click()

        # Wait for the form to be visible by waiting for its heading
        await expect(page.get_by_role("heading", name="Add New Node")).to_be_visible()

        # Fill out the form
        await page.get_by_label("Title *").fill("Test Node")
        await page.get_by_label("Author").fill("Test Author")
        await page.get_by_label("Year").fill("2024")
        await page.get_by_label("Tags (comma-separated) *").fill("AN1101")
        await page.get_by_placeholder("https://...").first.fill("https://example.com")
        await page.get_by_role("button", name="+ Add Link").click()
        await page.get_by_placeholder("https://...").last.fill("https://example.org")
        await page.get_by_placeholder("Key (e.g., ISBN)").fill("Test Key")
        await page.get_by_placeholder("Value").fill("Test Value")
        await page.get_by_role("button", name="+ Add Detail").click()
        await page.get_by_placeholder("Key (e.g., ISBN)").last.fill("Test Key 2")
        await page.get_by_placeholder("Value").last.fill("Test Value 2")

        # Click the add button
        await page.locator("form").get_by_role("button", name="Add", exact=True).click()

        # Take a screenshot to debug
        await page.screenshot(path="jules-scratch/verification/after_submit.png")

        # Wait for the node to appear on the graph
        await expect(page.get_by_text("Test Node")).to_be_visible()

        # Click the new node
        await page.get_by_text("Test Node").click()

        # Wait for the details sidebar to be visible
        await expect(page.locator("aside")).to_be_visible()

        # Take a screenshot of the details sidebar
        await page.locator("aside").screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

asyncio.run(main())
