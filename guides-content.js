// Guides at /guides/: long-form help articles that go with the tools. Bodies are HTML;
// [[tool:slug]] becomes a box linking to that tool, [[ad]] an ad placement (build.js).
module.exports = [
  {
    slug: "passport-photo-size-by-country",
    title: "Passport photo size by country",
    h1: "Passport and visa photo sizes by country",
    seo: "Passport Photo Size by Country: US, UK, Schengen, Canada, Australia | Memento Tools",
    description: "Exact passport and visa photo sizes for the US, UK, Schengen, Canada, Australia, India and China: photo size, head size, background, and the digital pixel sizes for online forms.",
    icon: "badge", color: "#5ab8ff", tools: ["passport-photo", "photo-signature-resizer"],
    updated: "2026-10-08",
    body: `
<p>Most rejected passport photos aren't blurry or badly lit. They fail on measurements: the head is a few millimetres too small, the photo is the wrong shape, or the background is the wrong shade. The rules are strict because the photo has to work with face-matching systems at border control, so an official won't let a near miss through.</p>
<p>Below are the sizes for the countries people ask about most, what "head size" actually means, and how to take a photo at home that passes.</p>

<h2>Sizes at a glance</h2>
<div class="g-table"><table>
<thead><tr><th>Document</th><th>Photo size</th><th>Head (chin to crown)</th><th>Background</th></tr></thead>
<tbody>
<tr><td>United States passport and visa</td><td>2 × 2 in (51 × 51 mm)</td><td>1 to 1⅜ in (25–35 mm)</td><td>White or off-white</td></tr>
<tr><td>United Kingdom passport</td><td>35 × 45 mm</td><td>29–34 mm</td><td>Plain cream or light grey</td></tr>
<tr><td>Schengen visa, most EU passports</td><td>35 × 45 mm</td><td>32–36 mm</td><td>Plain and light (light grey is common)</td></tr>
<tr><td>Canada passport</td><td>50 × 70 mm</td><td>31–36 mm</td><td>Plain white or light-coloured</td></tr>
<tr><td>Australia passport</td><td>35–40 × 45–50 mm</td><td>32–36 mm</td><td>Plain white or light grey</td></tr>
<tr><td>India visa</td><td>2 × 2 in (51 × 51 mm)</td><td>25–35 mm</td><td>White</td></tr>
<tr><td>China visa</td><td>33 × 48 mm</td><td>28–33 mm (head width 15–22 mm)</td><td>White</td></tr>
</tbody>
</table></div>
<p class="g-small">35 × 45 mm with a 32–36 mm head is the international (ICAO) layout, so if your country isn't listed, that's the most likely size. Always check the issuing office's own page before you print: rules do change.</p>

<h2>What "head size" really means</h2>
<p>This is where most home-made photos go wrong. Head size is measured from the bottom of the chin to the top of the head, the crown. It's not measured to the eyebrows or the hairline, and it doesn't include a big hairstyle sticking up above the skull. If your hair is voluminous, the crown is roughly where the top of your skull would be.</p>
<p>On a 35 × 45 mm photo, a 32–36 mm head fills about 70–80% of the height. That's much closer than most people expect. A typical phone snapshot, cropped to the right shape, leaves the head at maybe half the height, which is too small. On a US 2 × 2 inch photo the head takes 50–69% of the height, so there's a bit more room around it.</p>
<p>The eyes matter too. The US asks for the eyes to sit between 1⅛ and 1⅜ inches from the bottom of the photo, which in practice means a bit above the middle.</p>

<h2>Rules nearly every country shares</h2>
<ul>
<li><b>Recent.</b> Taken in the last six months, showing how you look now.</li>
<li><b>Neutral face.</b> Mouth closed, eyes open, looking straight at the camera. A slight natural smile is fine for the US; most others want no smile.</li>
<li><b>Even light.</b> No shadows on the face or behind the head, no shine on the forehead, no red eyes.</li>
<li><b>No filters or retouching.</b> Phone beauty modes count. Turn them off.</li>
<li><b>Glasses.</b> The US doesn't accept glasses at all, except with a medical statement. The UK asks you to take them off if you can. Elsewhere they're usually allowed if there's no glare and the frames don't cover the eyes, but taking them off is the safe choice.</li>
<li><b>Head coverings</b> only for religious or medical reasons, with the full face visible from the bottom of the chin to the top of the forehead.</li>
</ul>

<h2>Taking the photo at home</h2>
<p>You don't need a studio, but you do need a second person. Selfies are taken at arm's length with a wide-angle lens, which makes the nose look bigger and the ears smaller. Photo checkers and officials notice.</p>
<ol>
<li>Stand about half a metre in front of a plain, light wall. Standing away from the wall keeps your shadow off it.</li>
<li>Face a window during the day, so the light falls evenly on your face. Avoid overhead lamps; they put shadows under the eyes.</li>
<li>Ask someone to stand about 1.5 metres away and hold the phone at your eye level. Use the back camera, and its 2× lens if it has one.</li>
<li>Take several shots. Pick one where both ears show evenly and your shoulders are level.</li>
</ol>
<p>Then crop it to the exact size with the right head size. That's the fiddly part, and it's what our passport photo maker does for you: it finds your face, sets the head size for the country you pick, and can swap the background for plain white or grey.</p>
[[tool:passport-photo]]

<h2>Printing it</h2>
<p>Don't print a single photo on a full sheet. Order a standard 4 × 6 inch (10 × 15 cm) print at a pharmacy or photo kiosk, with several passport photos laid out on it. Six US photos or eight 35 × 45 mm photos fit on one, and it usually costs less than a single photo at a studio.</p>
<p>The one thing to check is scaling. The print must come out at 100%. If an app or printer "fits to page", every photo shrinks and the head size is wrong again. After printing, measure one photo with a ruler before you cut them out.</p>
[[ad]]

<h2>Digital photos for online applications</h2>
<p>Online forms usually want a file rather than a print, and they set pixel and file-size limits instead of millimetres:</p>
<ul>
<li><b>US visa (DS-160):</b> a square JPEG, at least 600 × 600 and at most 1200 × 1200 pixels, no bigger than 240 KB.</li>
<li><b>UK passport online:</b> at least 600 pixels wide and 750 pixels tall.</li>
<li><b>Exam and job portals</b> often ask for something like 200 × 230 pixels under 50 KB, plus a signature at its own size.</li>
</ul>
<p>Keep the original, high-quality photo, and make a smaller copy for each form. Squeezing one file down again and again makes it blotchy, and some systems reject photos that look over-compressed.</p>
[[tool:photo-signature-resizer]]

<h2>Official pages</h2>
<p>Requirements in this guide were current when we wrote it, but the issuing office always has the final word. Before you submit, check:</p>
<ul>
<li>United Kingdom: <a href="https://www.gov.uk/photos-for-passports" rel="noopener">gov.uk/photos-for-passports</a></li>
<li>United States: <a href="https://travel.state.gov/" rel="noopener">travel.state.gov</a> (Passports, then Photos)</li>
<li>Canada: <a href="https://www.canada.ca/" rel="noopener">canada.ca</a> (Canadian passports, then Passport photos)</li>
<li>Australia: <a href="https://www.passports.gov.au/" rel="noopener">passports.gov.au</a> (Photo guidelines)</li>
<li>Schengen visas: the website of the embassy or visa centre you're applying through</li>
</ul>
`,
  },

  {
    slug: "spot-a-fake-bank-statement",
    title: "How to spot a fake bank statement",
    h1: "How to tell if a bank statement or payslip has been edited",
    seo: "How to Spot a Fake or Edited Bank Statement (PDF and Photo) | Memento Tools",
    description: "Practical checks for landlords, employers and lenders: the arithmetic, the fonts, what's hidden in the PDF's properties, and what to do if a document looks edited.",
    icon: "plagiarism", color: "#8b7bff", tools: ["tamper-check"],
    updated: "2026-10-08",
    body: `
<p>Editing a PDF is easy now. A free online editor can change an amount, a name or a date in a couple of minutes, and the result often looks fine at a glance. If you rent out a flat, hire people, lend money or sell anything expensive, sooner or later someone will send you a document that isn't what it claims to be.</p>
<p>The good news is that edits leave traces. None of the checks below proves anything on its own, but together they tell you whether a document deserves a closer look.</p>

<h2>Start with how you received it</h2>
<p>A screenshot, a phone photo of a printout or a PDF that was "printed to PDF" has already lost most of the evidence. Ask for the statement exactly as it was downloaded from online banking. If the person can't or won't send that, it's worth asking why.</p>
<p>Even better is getting it from the source. Many banks will send a stamped statement or a balance letter on request, and some can confirm details directly with the person's consent. A short call to the employer's HR department settles a payslip in a minute.</p>

<h2>Check the arithmetic</h2>
<p>This catches a surprising number of edits, because changing one figure means changing every figure that depends on it, and people forget.</p>
<ul>
<li>Opening balance, plus money in, minus money out, should equal the closing balance.</li>
<li>If the statement has a running balance column, check a few rows in the middle, not just the first and last.</li>
<li>On a payslip, gross pay minus each deduction should equal net pay, and the year-to-date totals should grow by about one month's pay from one payslip to the next.</li>
<li>Look at the salary credit. Does the amount on the statement match the net pay on the payslip, and does it arrive on a sensible day each month?</li>
</ul>

<h2>Look closely at the page</h2>
<p>Zoom in to 200% or more. Edited text tends to sit slightly differently from the original:</p>
<ul>
<li><b>Fonts.</b> A changed number is often in a font that's almost, but not quite, the same: the 1 has a different foot, or the 7 a different angle.</li>
<li><b>Alignment.</b> Numbers in a column should line up on the decimal point. One amount sitting a pixel higher, lower or further left is a classic sign.</li>
<li><b>Spacing and weight.</b> Inserted text can look slightly bolder, lighter or more tightly spaced than its neighbours.</li>
<li><b>Background.</b> On scans and photos, a patch that's cleaner or a slightly different white than the paper around it suggests something was covered and retyped.</li>
<li><b>Details that should match.</b> Account number format, sort code or branch, statement period, page numbers ("page 2 of 3") and the address should all agree with each other and with what you know.</li>
</ul>

<h2>Look inside the PDF</h2>
<p>A PDF carries information you can't see on the page. Open it in a PDF reader and look at the document properties (in most readers: File, then Properties).</p>
<ul>
<li><b>Producer and creator.</b> Statements generated by a bank usually name a reporting or document system. Names like iLovePDF, Smallpdf, Sejda, PDFescape, Canva, Microsoft Word or an image editor mean the file passed through software people use to make or change documents.</li>
<li><b>Dates.</b> Compare the creation date with the modified date. A statement created at the bank on the 1st and modified two weeks later was opened and saved again somewhere.</li>
<li><b>Fonts.</b> The fonts tab lists every font in the file. A bank statement usually uses one or two families. An extra font that only appears in a handful of characters is worth finding on the page.</li>
<li><b>Saves.</b> PDFs can be saved "incrementally", with each change added to the end of the file. A statement saved several times after it was created has been through more hands than a bank's system.</li>
</ul>
<p>Our document tamper check reads all of this for you, and marks text in an odd font in red on the page itself. It runs in your browser, so you're not uploading someone's bank details anywhere.</p>
[[tool:tamper-check]]
[[ad]]

<h2>Photos and scans</h2>
<p>When you only have a photo, there's less to go on. Two things still help. The photo's hidden details (EXIF) may name editing software such as Photoshop, or show it was saved again long after it was taken. And error level analysis, which re-saves the image and shows where it changes most, can make a pasted-in number or name stand out from the rest of the page. Treat it as a hint: edges and sharp text always glow a little.</p>

<h2>Innocent explanations</h2>
<p>Before drawing conclusions, remember that genuine documents get these marks too:</p>
<ul>
<li>Filling in or signing a PDF form adds a save and sometimes a new font.</li>
<li>Merging several statements into one file, or compressing it to email it, changes the producer.</li>
<li>Some banks really do generate statements with tools that add later saves, and some staff do save letters from Word.</li>
<li>A statement printed and scanned at an office has no useful PDF details at all.</li>
</ul>
<p>Treat a warning as a reason to verify, not as proof of fraud.</p>

<h2>If something doesn't add up</h2>
<p>Don't accuse anyone on the strength of a font or a date. Ask for the document again, sent directly from the bank or employer, or for a short letter confirming the figure that matters to you. A genuine applicant will usually arrange that quickly. If the explanations get complicated, or the new copy shows different numbers, you have your answer.</p>
<p>For larger sums (a loan, a tenancy deposit, a vehicle sale) it's reasonable to make direct verification a standard step for everyone. Then nobody feels singled out.</p>
`,
  },

  {
    slug: "compress-pdf-for-online-applications",
    title: "Get a PDF under 100 KB or 200 KB",
    h1: "How to get a PDF under 100 KB or 200 KB for an online application",
    seo: "How to Reduce a PDF to 100 KB or 200 KB for Online Applications | Memento Tools",
    description: "Why application portals reject your PDF, what actually makes a PDF big, and step-by-step ways to get under 100 KB, 200 KB or 500 KB while keeping it readable.",
    icon: "compress", color: "#8b7bff", tools: ["compress-pdf", "image-to-pdf", "split-pdf"],
    updated: "2026-10-08",
    body: `
<p>University portals, job sites and government forms love tight upload limits: 100 KB for a certificate, 200 KB for an ID, 500 KB for a whole application. Then you scan a single page on your phone and the file comes out at 4 MB.</p>
<p>The limit isn't arbitrary. Portals keep thousands of applications, and a reviewer has to open them quickly. You can almost always get under it without making the document unreadable, as long as you know where the size is coming from.</p>

<h2>What makes a PDF big</h2>
<p>Text is tiny. A ten-page letter typed in Word and saved as PDF is often under 100 KB already. Size comes from images, and in documents people upload, the images are usually the pages themselves: photos or scans of certificates, IDs and mark sheets.</p>
<p>A modern phone photo is 12 megapixels or more. That's far more detail than a reviewer needs to read an A4 page, and it's stored in colour even when the page is black text on white paper. So the job is nearly always the same: make each page image smaller in pixels, store it in a way that suits the content, and leave out anything that doesn't need to be there.</p>

<h2>If you're starting from photos</h2>
<p>Don't make a huge PDF and then shrink it. Build the PDF at the right size in the first place.</p>
<ol>
<li><b>Take the photo square-on</b>, in daylight, with the page filling the frame. A tilted page wastes pixels on the table around it.</li>
<li><b>Crop to the paper.</b> Margins of carpet and fingers are still pixels.</li>
<li><b>Think about colour.</b> Certificates with a coloured seal should stay in colour, but plain text pages compress much better in black and white. If the file is still too big, run it through Compress PDF with "Black &amp; white" ticked.</li>
<li><b>Set the limit before you save.</b> Our image to PDF tool takes your photos and a target such as 200 KB, and lowers the quality step by step until the whole file fits.</li>
</ol>
[[tool:image-to-pdf]]

<h2>If you already have the PDF</h2>
<p>Run it through a compressor with a target size rather than a vague "high/medium/low" setting. Ours re-draws each page as an image and keeps trying smaller sizes until the file is under your limit, so you can type 100 and get a file under 100 KB, or the closest it can get while still readable. For pages that are just black text, tick "Black &amp; white" as well; plain text pages get noticeably smaller in black and white.</p>
[[tool:compress-pdf]]
<p>Two things to know about that approach. The pages become images, so the text can no longer be selected or searched; for an upload that's normally fine. And if the PDF is already mostly text, compressing it this way can make it bigger, not smaller. If a text-only PDF is over the limit, the cause is usually an embedded high-resolution logo or a scanned signature, and re-saving it from the original program at a lower image quality fixes it.</p>
[[ad]]

<h2>When it still won't fit</h2>
<p>Some combinations are simply impossible. Ten scanned pages under 100 KB means about 10 KB per page, which is too little for anyone to read small print. When you hit that wall:</p>
<ul>
<li><b>Upload only the pages they asked for.</b> If the form wants your passport's photo page, send that page, not the whole passport. Split the PDF and keep what's needed.</li>
<li><b>Check whether the portal allows several files.</b> Many accept one file per document type.</li>
<li><b>Lower the resolution before the quality.</b> An A4 page at around 1000 pixels wide is still readable on screen; at 600 it starts to struggle.</li>
</ul>
[[tool:split-pdf]]

<h2>Check before you upload</h2>
<p>After compressing, open the file and zoom to 100%. Can you read the smallest text that matters: the registration number, the date of birth, the grade? If you can't, the reviewer can't either, and an unreadable document can get an application rejected just like a missing one.</p>
<p>A few other things trip people up:</p>
<ul>
<li><b>Passwords.</b> Portals usually can't open protected PDFs. Remove the password before uploading.</li>
<li><b>File names.</b> Some older systems choke on spaces and symbols. "ssc-certificate.pdf" is safer than "SSC Certificate (final) #2.pdf".</li>
<li><b>File type.</b> If the form says PDF, a JPG renamed to .pdf won't work. Convert it properly.</li>
<li><b>Keep the original.</b> Save the full-quality file somewhere safe. You'll need it the next time a form asks for a different limit.</li>
</ul>

<h2>Why our tools work in the browser</h2>
<p>Certificates, IDs and mark sheets are exactly the kind of documents you shouldn't upload to a random website just to make them smaller. Every Memento tool processes files on your own device: nothing is sent to a server, so there's nothing for anyone to keep.</p>
`,
  },

  {
    slug: "leave-passwords-to-family",
    title: "Leave your passwords to your family",
    h1: "How to leave your passwords and crypto recovery phrase to your family, safely",
    seo: "How to Leave Passwords and a Crypto Recovery Phrase to Your Family Safely | Memento Tools",
    description: "A practical plan for making sure your family can reach your accounts and crypto if something happens to you, without writing everything on one piece of paper anyone could find.",
    icon: "key", color: "#ffb547", tools: ["secret-splitter", "encrypt-files"],
    updated: "2026-10-08",
    body: `
<p>If you died or ended up in hospital tomorrow, could your family get into your email, your phone, your bank accounts or your crypto wallet? For most people the honest answer is no. Everything is behind passwords that live only in their head or in a password manager nobody else can open.</p>
<p>The obvious fix, writing everything down and putting it in a drawer, creates the opposite problem. Anyone who finds the paper has everything. A good plan sits between the two: your family can get in when they need to, and nobody can get in before that.</p>

<h2>Use the built-in options first</h2>
<p>Several big services already have a way to hand over access, and they're the cleanest route because the service itself checks that the request is genuine:</p>
<ul>
<li><b>Google</b> has Inactive Account Manager: if your account goes unused for a period you choose, it can notify people you've picked and share selected data with them.</li>
<li><b>Apple</b> lets you add a Legacy Contact, who can request access to your iCloud data with an access key and a death certificate.</li>
<li><b>Facebook</b> lets you choose a legacy contact to look after a memorialised account.</li>
<li><b>Password managers</b> often have emergency access. Bitwarden, for example, lets a trusted person request access, which is granted automatically if you don't decline within a waiting period you set.</li>
</ul>
<p>Set these up first. They cover a lot, and they don't need you to write any password down.</p>

<h2>What's left: the master keys</h2>
<p>Some things have no recovery process at all. A crypto wallet's recovery phrase (the 12 or 24 words) is the clearest case: whoever has it has the money, and if it's lost, the money is gone. The same goes for a password manager's master password, a phone PIN, or the combination of a home safe.</p>
<p>These are the secrets worth planning properly, and the main choices are below.</p>

<h3>A sealed letter with someone you trust</h3>
<p>Simple, and fine for small amounts. The weakness is that one person, or anyone who gets to their drawer, holds everything. Don't put the secrets themselves in your will: in some places, such as England and Wales, a will becomes a public document after probate.</p>

<h3>An encrypted file, with the password kept apart</h3>
<p>Put the instructions and the secrets in an encrypted file, give copies of the file to family, and keep the password separately, for example with your lawyer. Neither half is useful on its own. Our encrypted document kit makes a single file that opens in any web browser with the password, so your family won't need special software.</p>
[[tool:encrypt-files]]

<h3>Split the secret into pieces</h3>
<p>This is the most robust option. A method called Shamir's secret sharing, published by the cryptographer Adi Shamir in 1979, splits a secret into several pieces so that a chosen number of them, and no fewer, can rebuild it. For example: three pieces, any two needed.</p>
<ul>
<li>Give one piece to your partner, one to a sibling and one to your lawyer.</li>
<li>Any one of them alone learns nothing at all, not even a hint of the secret.</li>
<li>Any two together can recover it, so losing one piece is not a disaster.</li>
</ul>
<p>Our secret splitter does exactly this, and prints each piece on its own page with a QR code and recovery instructions.</p>
[[tool:secret-splitter]]
[[ad]]

<h2>A note on typing a recovery phrase into a website</h2>
<p>Normally you should never type a wallet's recovery phrase into any website, and that advice stands. If you use a browser tool like ours for this, open the page, then turn off Wi-Fi and mobile data before typing the phrase. The splitter works fully offline once loaded, and nothing is sent anywhere, but going offline means you don't have to take our word for it. Close the tab when you're done.</p>
<p>For a large amount of crypto, also look at what your hardware wallet offers. Some, such as Trezor's Shamir Backup, can create split recovery shares on the device itself, so the phrase never touches a computer.</p>

<h2>Write the instructions, not just the secrets</h2>
<p>A recovery phrase is useless to someone who doesn't know what it is. Alongside the secrets, leave a plain-language note:</p>
<ul>
<li>A list of accounts that matter: banks, pensions, insurance, crypto exchanges and wallets, email, the domain names and subscriptions that would keep charging.</li>
<li>For each, what you'd want done: close it, transfer it, keep it running.</li>
<li>Who holds which piece, how many pieces are needed and where to recover them.</li>
<li>Who to call for help: your accountant, lawyer, or a technically minded friend.</li>
</ul>

<h2>Test it, then review it once a year</h2>
<p>Before handing anything out, recover the secret yourself from two of the pieces. It takes a minute and it's the only way to be sure the plan works. Then put a yearly reminder in your calendar to check the list: accounts change, people move, and a plan that was right three years ago may point to a wallet you emptied long ago.</p>
<p>It isn't a cheerful job. But an evening spent on it now saves the people you care about months of locked accounts and lost savings later.</p>
`,
  },
];
