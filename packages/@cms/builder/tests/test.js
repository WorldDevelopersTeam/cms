import { expect, test } from '@playwright/test';

test('Navigates to root-level page', async ({ page }) => {
    await page.goto('http://localhost:5173/theme-nonprofit');
    await page.waitForSelector('.spinner-container', { state: 'detached' });
    await page.click('button#toolbar--pages');
    await page.getByRole('link', { name: 'About /about' }).click();
    await page.getByRole('navigation', { name: 'toolbar' }).getByText('About')
	await page.waitForTimeout(100);
    await expect(page.url()).toBe('http://localhost:5173/theme-nonprofit/about');
});

test('Navigates to child-level page', async ({ page }) => {
    await page.goto('http://localhost:5173/theme-nonprofit');
    await page.waitForSelector('.spinner-container', { state: 'detached' });
	await page.click('button#toolbar--pages');
    await page.getByRole('link', { name: 'Blog Post /blog-post' }).click();
	await page.getByRole('navigation', { name: 'toolbar' }).getByText('Blog Post')
	await page.waitForTimeout(100);
    await expect(page.url()).toBe('http://localhost:5173/theme-nonprofit/blog/blog-post');
});

test('Edits Site CSS', async ({ page }) => {
    await page.goto('http://localhost:5173/theme-minimal');
	await page.waitForSelector('.spinner-container', { state: 'detached' });
    await page.getByRole('button', { name: 'Site' }).click();
    await page.getByRole('button', { name: 'Toggle code mode' }).click();
    await page.getByText('rem').first().click();
    await page.getByText('1', { exact: true }).nth(2).click();
    await page.getByText('rem').first().click();
    await page.getByText('/*! tailwindcss v2.2.17 | MIT License | https://tailwindcss.com *//*! modern-normalize v1.1.0 | MIT License | https://github.com/sindresorhus/modern-normalize */progress,sub,sup{vertical-align:baseline}blockquote,body,dd,dl,fieldset,figure,h1,h2,h3,h4,h5,h6,hr,ol,p,pre,ul{margin:0}fieldset,legend,ol,ul{padding:0}a,hr{color:inherit}*,::after,::before{box-sizing:border-box;box-sizing:border-box;border:0 solid currentColor;--tw-border-opacity:1;border-color:rgba(229,231,235,var(--tw-border-opacity))}body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji'}abbr[title]{-webkit-text-decoration:underline dotted;text-decoration:underline dotted}b,strong{font-weight:bolder}code,kbd,pre,samp{font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-size:100%;line-height:1.15;margin:0}button,select{text-transform:none}[type=button],[type=reset],[type=submit],button{-webkit-appearance:button}::-moz-focus-inner{border-style:none;padding:0}:-moz-focusring{outline:ButtonText dotted 1px;outline:auto}:-moz-ui-invalid{box-shadow:none}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}button{background-color:transparent;background-image:none}ol,ul{list-style:none}html{-moz-tab-size:4;tab-size:4;-webkit-text-size-adjust:100%;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";line-height:1.5}body{font-family:inherit;line-height:inherit}hr{height:0;border-top-width:1px}img{border-style:solid}textarea{resize:vertical}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}[role=button],button{cursor:pointer}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{text-decoration:inherit}button,input,optgroup,select,textarea{padding:0;line-height:inherit;color:inherit}code,kbd,pre,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]{display:none}#page { font-').fill('\n\n@import url("https://unpkg.com/@wdt-app/primo@1.3.64/reset.css");\n\n\n#page {\n  font-family: system-ui, sans-serif;\n  color: var(--color);\n  line-height: 1.6; \n  font-size: 5rem;\n  background: var(--background);\n}\n\n\n.section-container {\n  max-width: var(--max-width, 1000px);\n  margin: 0 auto;\n  padding: 3rem var(--padding, 1rem); \n}\n\n\n.heading {\n  font-size: 3rem;\n  line-height: 1;\n  font-weight: 700;\n  margin: 0;\n}\n\n\n.button {\n  color: white;\n  background: var(--color-accent);\n  border-radius: 5px;\n  padding: 8px 20px;\n  transition: var(--transition);\n\n\n  &:hover {\n    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.1);\n  } \n\n\n  &.inverted {');
    await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForTimeout(2000);

	const fontSize = await page.$eval('#page', (element) => {
		return window.getComputedStyle(element).getPropertyValue('font-size');
	});

	const expectedFontSizePixels = 80; // 5rem equals 80px for most browsers by default
	expect(parseFloat(fontSize)).toBe(expectedFontSizePixels);
});

test('Creates a new page', async ({ page }) => {
    await page.goto('http://localhost:5173/theme-nonprofit');
    await page.waitForSelector('.spinner-container', { state: 'detached' });
	await page.click('button#toolbar--pages');
    await page.getByRole('button', { name: 'Create Page' }).click();
	await page.getByPlaceholder('About Us', { exact: true }).fill('blankpage');
	await page.getByRole('combobox', { name: 'Create from' }).selectOption('null');
	await page.getByRole('listitem').filter({ hasText: 'Page Name Page URL Create from Blank───────AboutMissionHome PageTeamBlogBlog Pos' }).getByRole('button').click();
	const detailsElement = await page.$('.details:has-text("blankpage /blankpage")');
	expect(detailsElement).not.toBeNull();
});
