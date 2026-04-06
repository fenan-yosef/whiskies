[33mcommit 9e839febc6123f05873ed56f6dbfdc1b02702f14[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32mmaster[m[33m)[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Mon Apr 6 19:08:36 2026 +0300

    feat: document security maintenance actions including password rotations and updates

[33mcommit 34ce7de5a3677458b029bbb4d6038798d2f00da2[m[33m ([m[1;31morigin/master[m[33m, [m[1;31morigin/HEAD[m[33m)[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Fri Apr 3 07:59:23 2026 +0300

    feat: add health check for embedding service during deployment

[33mcommit 6e8bdfe641668e147540fd926ca055bc0a22c7ca[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Thu Apr 2 13:51:08 2026 +0300

    feat: add post-deploy smoke check for embeddings system endpoint in CI workflow

[33mcommit 31b1fc0a8bb330e6a073983af9222868422074d1[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Thu Apr 2 13:14:28 2026 +0300

    feat: extend CI/CD workflow to deploy Python embedding service on master push

[33mcommit 9818b3cec7d16e3acf8bd24b76a065259c322783[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Thu Apr 2 13:11:50 2026 +0300

    feat: implement system status and process management endpoints; enhance EmbeddingManager with task management UI

[33mcommit 1c691f79d1e73a92f6619f1d6a43f93ffd43f55f[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Wed Apr 1 15:41:17 2026 +0300

    feat: document deployment process and operational notes for Python embedding service

[33mcommit 78ddb4c62bf6b6bc50b30cd22238be483ff1012e[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Wed Apr 1 15:08:03 2026 +0300

    feat: simplify AdminPage by removing unused state and components; update header for clarity

[33mcommit 783095665ec5d793091615a7fea809812686a25b[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Wed Apr 1 15:03:29 2026 +0300

    feat: improve layout responsiveness and enhance image display in EmbeddingManager

[33mcommit 8ea6306428b32ef3a3c57dd9fd4baef2e89d329b[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Wed Apr 1 14:48:33 2026 +0300

    feat: update active tab to default to 'search' and improve job error handling

[33mcommit 9685247fad4b20e1dd3b06fa962f10bce3926bd7[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Wed Apr 1 14:42:37 2026 +0300

    feat: enhance embedding job management with pause, resume, and cancel functionality
    
    - Added support for pausing, resuming, and canceling embedding jobs in the EmbeddingManager component.
    - Updated job status handling in the backend to accommodate new job control actions.
    - Introduced new UI elements for job control actions and improved user feedback messages.
    - Refactored job status management to include 'paused' state and related logic.
    - Enhanced health check endpoint to reflect active job statuses accurately.

[33mcommit 15856fd3e38712115fcda1a9dd263a4bcc9d577a[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Wed Apr 1 14:31:25 2026 +0300

    feat: increase embedding limit and update sidebar menu item label

[33mcommit ce026b36aed3e2865ffcb2dc70acd4c36cda2d07[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Wed Apr 1 14:24:34 2026 +0300

    feat: update embedding service command with asyncio and h11 support

[33mcommit 3ec0a29db8e62cbccb5990a2f47986b40c3e4c25[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Wed Apr 1 13:50:46 2026 +0300

    Add embedding service implementation and dependencies
    
    - Implemented the embedding service in `embedding_service.py` to handle image embeddings using CLIP.
    - Added FastAPI routes for health check, reindexing, job status, image retrieval, and image search.
    - Integrated MySQL for image data storage and retrieval.
    - Introduced job management for reindexing with progress tracking.
    - Added requirements for FastAPI, MySQL connector, NumPy, Requests, Pillow, Pandas, OpenCV, and PyTorch in `requirements.txt`.

[33mcommit 93366698d56e2325c09135670f45dcd2c8c53b86[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Wed Apr 1 13:28:48 2026 +0300

    feat: enhance database connection handling and embedding script
    
    - Updated .gitignore to exclude scraper_activity_log.md.
    - Refactored db.ts to improve database connection logic with fallback for empty passwords in non-production environments.
    - Enhanced create_embedding_sql.py to load environment variables from a .env file and added error handling for database connections.
    - Introduced command-line argument parsing for limiting the number of rows processed in create_embedding_sql.py.
    - Added new scripts run_embed.ps1 and run_embed.sh for easier execution of the embedding process with environment checks.
    - Created new numpy files for final embeddings, image IDs, and OCR texts.

[33mcommit 6cb60f627c50096e55d5f4815a3ef29ebd7ed56f[m
Author: Ramim Siddiqui <ramimalisiddiqui0@gmail.com>
Date:   Wed Apr 1 09:42:47 2026 +0500

    Added python codes for embeddings and searching

[33mcommit e914e968b32fa0140c7e6e9dbe9d62b354f22933[m
Author: Ramim Siddiqui <ramimalisiddiqui0@gmail.com>
Date:   Wed Apr 1 09:40:11 2026 +0500

    Removed Existing FIles

[33mcommit d34e3919b11410075d57ba8db0e94c3a6fd9438c[m[33m ([m[1;32mback-up[m[33m)[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Mon Mar 30 08:05:11 2026 +0300

    refactor: remove unused pool import from whisky images and reviews API routes

[33mcommit 44b59706fb25c746472af7b7af003f2e13619aed[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Mon Mar 30 08:01:55 2026 +0300

    refactor: rename wine references to whisky and remove unused wine-reviews API

[33mcommit a660a78dacc6eba5a928d1e5470a8fd866d6cae8[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Mon Mar 30 07:40:29 2026 +0300

    fix: update WhiskyTable button click handler

[33mcommit 976426e6f367221d0654ffe3c5b5ed7f2ac57c3f[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Mon Mar 30 07:32:45 2026 +0300

    refactor: rename wine references to whisky across the application
    
    - Updated database queries to switch from wine_products to whisky_products.
    - Changed API endpoints and data handling to reflect whisky instead of wine.
    - Modified components and state management to handle whisky data.
    - Adjusted mock data and related functions to support whisky entities.
    - Updated UI elements, including modals and tables, to display whisky information.

[33mcommit 6e7c190f28684747af5ddcb94a5999deaf242ee4[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Mon Mar 30 07:24:29 2026 +0300

    feat: implement API routes for whisky images and reviews, add WineImagesModal and WineModal components

[33mcommit 42d40146809bfd250bbf6f82b45ef1fc23c229b9[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sun Mar 29 17:03:11 2026 +0300

    feat: add clear filters button and reset functionality in Dashboard

[33mcommit ce5d99d3fd3b996e64bab45f7cd08775e1052a88[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sun Mar 29 16:57:47 2026 +0300

    feat: enhance API and UI with filters for images and reviews, update sidebar title

[33mcommit 906e7339b4bf71325541349c0674fc8c87f4f71c[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sun Mar 29 13:59:38 2026 +0300

    refactor: comment out unused elements in Sidebar and AnalyticsPage for cleaner code

[33mcommit 85555a9c7a16961f7140a9f854dbaa23059085e6[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sun Mar 29 13:55:26 2026 +0300

    refactor: comment out unused sidebar elements for cleaner code

[33mcommit 00827a2f382952fe177222aa29eac68244286710[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sun Mar 29 09:56:59 2026 +0300

    feat: implement AnalyticsPage and API route for analytics data retrieval

[33mcommit f435be5c72a651ae8920f701a31afe7544e6a6ce[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sun Mar 29 09:23:06 2026 +0300

    refactor: update global styles and layout for improved UI/UX
    
    - Changed font variables in globals.css to use new font families.
    - Added background gradients and styles for various components in globals.css.
    - Updated layout.tsx to incorporate new fonts and styles, enhancing the overall appearance.
    - Refactored Dashboard component in page.tsx to improve layout and styling, including new card designs and animations.
    - Enhanced SearchBar component to accept custom input class names for better styling flexibility.
    - Redesigned Sidebar component with updated navigation styles and added a Trust Layer section for improved user confidence.

[33mcommit 635903fdfb68ef5a212d55c0eee8621135cca2ab[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sun Mar 29 09:14:59 2026 +0300

    feat: enhance ReviewsModal with star rating and product name display
    
    - Added StarRating component to display average ratings in ReviewsModal.
    - Included productName prop in ReviewsModal for dynamic title.
    - Improved layout and styling of reviews section with ScrollArea for better UX.
    - Updated loading states and no reviews message for clarity.
    
    feat: update SearchBar to accept custom className prop
    
    - Modified SearchBar component to allow passing of additional class names for styling.
    
    refactor: revamp Sidebar layout and navigation
    
    - Reorganized Sidebar component with improved styling and structure.
    - Added dynamic active link highlighting based on current pathname.
    - Removed unnecessary sections and streamlined user profile display.
    
    style: enhance WineTable action buttons and layout
    
    - Updated action buttons in WineTable for viewing images and reviews with improved styling.
    - Added icons to buttons for better visual representation.
    - Adjusted layout for better spacing and user interaction.

[33mcommit 6f8cb83cc0335936aa7b35826ca17023751a6a86[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sun Mar 29 08:44:56 2026 +0300

    feat: add ReviewsModal component and integrate with WineTable for displaying reviews

[33mcommit 1f99541792b5f3bb77a86f2d426dc1a268beadb6[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Tue Mar 24 10:32:50 2026 +0300

    feat: hide Actions column in WineTable component

[33mcommit a386935a9ac2066fdae0e0b49a707ddf91488d44[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Tue Mar 24 09:58:28 2026 +0300

    feat: add ignore_files to .gitignore and ensure newline at end of file

[33mcommit d5109a1efe7631f509569254299ee6a5bb3b1e2a[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Tue Mar 24 09:56:45 2026 +0300

    feat: remove edit and delete buttons from WineTable component

[33mcommit 6668d24ce82935dde8dd3620018925c509ac2a64[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Mon Mar 16 15:50:51 2026 +0300

    test ci/cd

[33mcommit 28f6c76ea6322e373fe8157d8fae45471f1da28e[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Mon Mar 16 15:41:18 2026 +0300

    chore: remove unnecessary comment in database configuration

[33mcommit f136619b15c9067577b997cf06944db07bd2e060[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sat Mar 14 09:59:55 2026 +0300

    feat: add setup_https script for SSL certificate generation and Nginx configuration

[33mcommit 4c627ac6bd0707038926a604d1a9cdd146cad969[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sat Mar 14 09:46:34 2026 +0300

    feat: add remote_fix_db script for database setup and PM2 management

[33mcommit 9a8d1240a4b4a98b16b453ab5860f73b0521e29f[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sat Mar 14 09:39:45 2026 +0300

    ci: pin webfactory/ssh-agent to v0.5.1 for deploy

[33mcommit 2a2dbd9c0ef00c0b831b39e91924276a97de1d44[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sat Mar 14 09:33:10 2026 +0300

    ci: allow pnpm install without frozen lockfile in CI

[33mcommit bdae29cecfe71fdb127b111c74e28485fa3db2ed[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Sat Mar 14 09:17:47 2026 +0300

    feat: enhance wine filtering and image handling in dashboard and modal components

[33mcommit 29144bfcb670055777e05fbf213e57a1a12249a1[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Fri Mar 13 18:12:32 2026 +0300

    chore: align deploy with master and env-driven db config

[33mcommit f82e15f97b33cfb0dedf2f1faea5069e02c3d09b[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Fri Mar 13 18:03:27 2026 +0300

    ci: add GitHub Actions CI/CD workflow and deploy helper

[33mcommit df6bb52085d4f6d20f7b9f2753e0682242ab1d32[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Wed Feb 25 09:00:09 2026 +0300

    feat: update favicon references and add new favicon.ico file

[33mcommit e9761798c9132b2f53002ae0845b38c08a596d46[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Wed Feb 25 08:28:45 2026 +0300

    feat: enhance WineImagesModal to support additional image sources and improve loading logic
    
    - Added `file_path` to ImageRecord interface for better image handling.
    - Updated image fetching logic to include `file_path` along with `url` and `data_url`.
    - Improved rendering logic to ensure all available image sources are utilized.
    - Added a new TypeScript definition file for lodash.debounce to provide type safety for debounce function usage.

[33mcommit ef297a78cf08923698607e874847bd3f4872d0a8[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Thu Feb 12 13:41:45 2026 +0300

    feat: integrate image embedding service with visual similarity search and update admin interface

[33mcommit 78d319892423bafa7b7ede6e7f7f9cc29a972af3[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Thu Feb 12 13:14:30 2026 +0300

    feat: update package dependencies and add dotenv for environment variables
    
    chore: update pnpm-lock.yaml with new dependencies
    
    fix: modify database initialization script to create new tables and update database name
    
    feat: add API routes for managing wine images with GET, POST, PUT, DELETE methods
    
    feat: create WineImagesModal component for displaying wine images
    
    feat: implement WineModal component for adding and editing wine details
    
    feat: create WineTable component for displaying and managing wine entries
    
    feat: add migration script to transfer data from old whiskies table to new structure

[33mcommit fff7b1ac5d399ae0fd779e9881fc873be765bead[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Fri Jan 30 10:03:06 2026 +0300

    feat: implement CRUD operations for whiskies and enhance admin page with pagination and search functionality

[33mcommit 6250c664947390be6c533936961519edceb1bf89[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Thu Jan 29 22:31:00 2026 +0300

    feat: add mock data for whiskies and utility functions
    
    - Created a new `mockData.ts` file with an interface for Whisky and mock data entries.
    - Implemented functions to manage whisky data: search, add, update, delete, and reset.
    - Added a `utils.ts` file for class name merging using `clsx` and `tailwind-merge`.
    - Configured Next.js with TypeScript support and unoptimized images in `next.config.mjs`.
    - Added placeholder images and logos in various formats to the public directory.
    - Established global styles in `globals.css` with Tailwind CSS utilities and custom properties.
    - Configured Tailwind CSS in `tailwind.config.ts` with custom themes and animations.

[33mcommit 1962deb4db020ea39e630352fe56c34295999254[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Thu Jan 29 22:06:02 2026 +0300

    Add database initialization script and Tailwind CSS configuration
    
    - Created init_db.js to set up MySQL database and whiskies table.
    - Added tailwind.config.js for Tailwind CSS setup.

[33mcommit 78c7ff8650de388e73871d684c5559c8336ea7c7[m
Author: Fenan <fenanyosef@gmail.com>
Date:   Thu Jan 29 20:09:17 2026 +0300

    Initial commit from Create Next App
