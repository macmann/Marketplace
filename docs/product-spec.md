# Myanmar Local Marketplace
## Production-Grade Product Specification

**Document Version:** 1.0  
**Product Type:** Consumer C2C local marketplace  
**Primary Market:** Myanmar  
**Initial Focus:** Used goods, new/unused personal goods, and free/giveaway items  
**Excluded From Initial Scope:** Property, vehicles, jobs, professional services

---

# 1. Product Vision

Build the easiest and safest local marketplace in Myanmar for people to:

- Sell things they no longer need.
- Buy affordable second-hand or new goods nearby.
- Give away unwanted items for free.
- Discover useful items within their city or township.
- Communicate directly with buyers and sellers.
- Complete transactions locally without marketplace complexity.

The product should combine the simplicity of Facebook Marketplace with the structured marketplace experience of Kleinanzeigen.

The initial positioning is:

> **Buy · Sell · Give Away**

The product should feel local, mobile-first, fast, multilingual, and extremely easy to use even for users who are not technically sophisticated.

---

# 2. Product Principles

## 2.1 Simplicity First

A user should be able to create a listing in under two minutes.

The default selling flow should be:

1. Upload photos.
2. Enter or generate title.
3. Select category.
4. Enter price or choose Free.
5. Select condition.
6. Select location.
7. Publish.

Advanced fields should remain optional unless required by the category.

---

## 2.2 Local First

The marketplace primarily connects people within reasonable geographic proximity.

Location hierarchy:

```text
Country
  └── State / Region
       └── City
            └── Township
```

Example:

```text
Myanmar
  └── Yangon Region
       └── Yangon
            └── Sanchaung
```

Precise residential addresses must never be displayed publicly.

---

## 2.3 Mobile First

The majority of Myanmar users will access the platform using smartphones.

Design priorities:

- Fast mobile web experience.
- PWA support.
- Minimal navigation.
- Large touch targets.
- Optimized images.
- Low bandwidth support.
- Graceful handling of poor network conditions.

Native mobile apps can follow later.

---

## 2.4 Trust Without Excessive Friction

Marketplace trust should be established through:

- Phone verification.
- Account history.
- Seller activity.
- Reporting.
- Blocking.
- Ratings.
- Listing moderation.
- Suspicious activity detection.
- Clear safety guidelines.

Do not require excessive KYC for ordinary marketplace usage.

---

# 3. Target Users

## 3.1 Casual Seller

Example:

A person has an old television, desk, phone, or child stroller they no longer use.

Primary goals:

- Sell quickly.
- Avoid complicated listing creation.
- Talk directly to buyers.
- Avoid scams.

---

## 3.2 Bargain Buyer

Primary goals:

- Find affordable goods.
- Search nearby.
- Compare prices.
- Contact sellers.
- Save interesting listings.

---

## 3.3 Giveaway User

Someone wants to dispose of useful items without throwing them away.

Examples:

- Furniture.
- Books.
- Baby clothes.
- Household appliances.
- Office equipment.

Primary goal:

> Give something away to somebody nearby who can use it.

---

## 3.4 Small Casual Seller

A person occasionally sells multiple items.

Examples:

- Used electronics.
- Clothing.
- Handmade items.
- Imported goods.

Initially treat these users like regular sellers.

Business seller functionality can be introduced later.

---

# 4. Initial Marketplace Categories

Recommended top-level categories:

```text
Electronics
Home & Furniture
Appliances
Fashion
Baby & Kids
Sports & Outdoors
Books & Education
Hobbies & Collectibles
Bicycles
Beauty & Personal Care
Tools & DIY
Office & Business Equipment
Pet Supplies
Other
Free Items
```

---

# 5. Category Hierarchy

Categories should support unlimited nesting.

Example:

```text
Electronics
 ├── Mobile Phones
 ├── Tablets
 ├── Computers
 │    ├── Laptops
 │    ├── Desktops
 │    └── Accessories
 ├── TVs
 ├── Cameras
 ├── Gaming
 └── Audio
```

The backend must allow administrators to:

- Add categories.
- Rename categories.
- Disable categories.
- Reorder categories.
- Create subcategories.
- Configure category-specific attributes.

---

# 6. Marketplace Listing Types

Listings should support:

```text
SALE
FREE
```

Future listing types:

```text
WANTED
SWAP
SERVICE
RENTAL
```

These should not initially appear in the UI.

---

# 7. Listing Conditions

Supported conditions:

```text
NEW
LIKE_NEW
GOOD
FAIR
POOR
NOT_SPECIFIED
```

User-facing values may be localized.

Example:

```text
New
Like New
Good
Fair
Needs Repair
```

---

# 8. Listing Lifecycle

Every listing should have one status.

```text
DRAFT
PENDING_REVIEW
ACTIVE
RESERVED
SOLD
EXPIRED
REMOVED
REJECTED
ARCHIVED
```

Typical flow:

```text
Draft
 ↓
Published
 ↓
Active
 ↓
Reserved
 ↓
Sold
```

Alternative:

```text
Active
 ↓
Expired
```

Moderation:

```text
Active
 ↓
Removed
```

---

# 9. Listing Creation Flow

## Step 1 — Photos

Allow:

- Camera capture.
- Gallery upload.
- Drag and drop on desktop.

Recommended:

- Maximum 10 images.
- Minimum 1 image recommended.
- WebP or AVIF conversion.
- Server-side resizing.

Image sizes:

```text
Thumbnail
Medium
Large
Original
```

Strip EXIF GPS metadata.

---

## Step 2 — AI Assistance

After image upload, optionally analyze the images.

AI may suggest:

- Listing title.
- Category.
- Subcategory.
- Condition.
- Description.
- Relevant attributes.
- Search keywords.

Example:

Input:

User uploads Samsung television images.

Suggested output:

```text
Title:
Samsung 43-inch Smart TV

Category:
Electronics → TVs

Condition:
Good

Suggested Description:
Samsung 43-inch Smart TV in good working condition.
Used at home and selling because of upgrade.
```

The user must always approve or edit AI-generated content.

---

# 10. Listing Form

Core fields:

```text
Title
Description
Category
Subcategory
Listing Type
Price
Currency
Condition
Photos
Location
Seller
Status
Created At
Updated At
```

Price is mandatory for SALE listings.

FREE listings use:

```text
price = 0
listingType = FREE
```

Do not rely solely on `price = 0` to identify giveaways.

---

# 11. Category Attributes

Different categories require different characteristics.

Example Mobile Phones:

```text
Brand
Model
Storage
Color
Warranty
Dual SIM
```

Example Furniture:

```text
Material
Dimensions
Color
Assembly Required
```

Use dynamic category attributes instead of adding columns to the Listing table.

Suggested structure:

```text
CategoryAttribute
ListingAttributeValue
```

---

# 12. Search

Search is a core product capability.

Users should be able to search:

```text
iPhone 13
Samsung TV
စားပွဲ
ကုလားထိုင်
Laptop
baby stroller
```

---

# 13. Myanmar Language Search

Search must support:

- Myanmar Unicode.
- English.
- Mixed Burmese-English.
- Case-insensitive English search.
- Spelling variations.
- Synonyms.
- Transliteration where possible.
- Common marketplace abbreviations.

Example searches:

```text
iphone
i phone
iPhone 13
ဖုန်း
ဖုန်းရောင်း
Samsung ဖုန်း
TV ရောင်းမယ်
စားပွဲ
table
```

These should produce semantically relevant results.

---

# 14. Search Architecture

Recommended initial search engine:

```text
PostgreSQL Full Text Search
+
pg_trgm
```

For larger scale:

```text
Typesense
Meilisearch
OpenSearch
Elasticsearch
```

Recommended architecture:

```text
Application
 ↓
Search Service
 ↓
Search Index
```

Do not tightly couple application logic to a specific search engine.

---

# 15. Search Ranking

Suggested ranking factors:

```text
Text relevance
Category match
Distance
Listing freshness
Seller reputation
Listing engagement
Photo quality
Availability
```

Avoid allowing paid boosts to completely override relevance.

---

# 16. Filters

Core filters:

```text
Category
Subcategory
Location
Price Min
Price Max
Condition
Listing Type
Posted Date
```

Sorting:

```text
Recommended
Newest
Price Low → High
Price High → Low
Nearest
```

---

# 17. Browse Experience

Homepage sections:

```text
Search
Categories
Nearby Listings
Recently Added
Free Items
Popular Near You
Recommended For You
```

Initial recommendation algorithms can be simple.

Example:

```text
Same city
Same township
Popular category
Recent listings
```

Machine-learning personalization is not required for MVP.

---

# 18. Free Items

Free items should be a first-class experience.

Homepage should prominently include:

> Free Near You

Users should be able to:

- Filter only free listings.
- Browse giveaway categories.
- Subscribe to nearby giveaways later.
- Save free listings.

Seller flow:

```text
Selling
Giving Away
```

If Giving Away is selected:

```text
price field disappears
listingType = FREE
```

---

# 19. Listing Detail Page

Display:

```text
Photo Gallery
Title
Price
Condition
Description
Category
Location
Posted Date
Seller Profile
Seller Reputation
Save Button
Share Button
Chat Button
Report Button
```

Optional:

```text
Make Offer
```

---

# 20. Seller Profile

Public profile should show:

```text
Display Name
Profile Picture
Member Since
Phone Verified Badge
Number of Active Listings
Number of Sold Listings
Seller Rating
Response Rate
Approximate Response Time
```

Do not display:

```text
Phone number
Email
Exact address
Private transaction details
```

---

# 21. Authentication

Recommended login methods:

```text
Phone Number + OTP
Google
Apple
Email
```

Primary onboarding for Myanmar:

```text
Phone OTP
```

Account creation should be extremely lightweight.

---

# 22. Phone Verification

Phone number should be verified before:

- Creating listings.
- Sending significant numbers of messages.
- Making offers.
- Reporting other users repeatedly.

Phone numbers should never be publicly visible by default.

---

# 23. Messaging

The product requires built-in messaging.

Buyer flow:

```text
Listing
 ↓
Message Seller
 ↓
Conversation Created
```

Each conversation should reference:

```text
buyerId
sellerId
listingId
```

---

# 24. Messaging Features

MVP:

```text
Text
Listing preview
Timestamps
Read status
Block user
Report user
```

Phase 2:

```text
Images
Voice messages
Location sharing
Offers
Quick replies
Push notifications
```

---

# 25. Offer System

Optional but recommended.

Buyer can send:

```text
Offer: 350,000 MMK
```

Seller options:

```text
Accept
Reject
Counter
```

Offer state:

```text
PENDING
ACCEPTED
REJECTED
COUNTERED
WITHDRAWN
EXPIRED
```

Accepting an offer does not automatically mean payment is completed.

---

# 26. Reservation

Seller can mark:

```text
Reserve for Buyer
```

Listing state becomes:

```text
RESERVED
```

Seller may later:

```text
Mark Sold
Return to Active
```

---

# 27. Favorites

Users may save listings.

Features:

```text
Save
Unsave
Favorites Page
```

Phase 2:

```text
Price change notifications
Listing sold notifications
Similar listing alerts
```

---

# 28. Notifications

Notification channels:

```text
In-App
Push Notification
Email
SMS
```

MVP should prioritize:

```text
In-App
Push
```

Important notifications:

```text
New message
Offer received
Offer accepted
Listing reserved
Listing expired
Listing removed
Report status
```

---

# 29. Location System

Location data model:

```text
Country
Region
City
Township
```

Each geographic entity should contain:

```text
id
nameEnglish
nameMyanmar
latitude
longitude
parentId
```

---

# 30. Approximate Location

Listings may optionally store coordinates.

Example:

```text
latitude
longitude
```

However, publicly display only approximate location.

Example:

```text
Sanchaung Township, Yangon
```

Do not expose exact seller coordinates.

Coordinates are useful internally for:

```text
distance calculation
nearest listings
map search
ranking
```

---

# 31. Maps

Maps are optional for MVP.

Possible providers:

```text
Google Maps
Mapbox
OpenStreetMap
```

OpenStreetMap-based solutions may reduce cost.

---

# 32. Trust & Safety

Trust and safety should be built into the architecture from day one.

Core features:

```text
Report listing
Report user
Block user
Phone verification
Moderation queue
Listing removal
Account suspension
Fraud detection
Spam detection
Rate limiting
Audit logs
```

---

# 33. Reporting

Report reasons:

```text
Scam
Counterfeit
Prohibited Item
Misleading Listing
Spam
Wrong Category
Harassment
Duplicate Listing
Sold Item
Other
```

---

# 34. Prohibited Goods

Marketplace policies must prohibit items such as:

```text
Illegal drugs
Weapons
Explosives
Stolen goods
Counterfeit goods
Pornographic material
Unsafe medicines
Human trafficking-related content
Fraudulent financial products
Protected wildlife
Illegal gambling products
```

Admins should manage prohibited categories and keywords.

---

# 35. Automated Moderation

On listing creation run:

```text
Text moderation
Image moderation
Keyword rules
Duplicate detection
Spam scoring
Fraud scoring
```

Outcome:

```text
ALLOW
REVIEW
BLOCK
```

---

# 36. Duplicate Detection

Potential duplicate signals:

```text
Same seller
Similar title
Same images
Similar description
Same phone-linked account
Repeated posting pattern
```

Perceptual image hashing can detect duplicated images.

---

# 37. Ratings

Ratings should be possible only after marketplace interaction.

Recommended:

```text
1–5 stars
```

Dimensions may later include:

```text
Communication
Item Accuracy
Reliability
```

Avoid allowing arbitrary users to review anyone.

---

# 38. User Reputation

Internally calculate trust score based on:

```text
Account age
Phone verification
Completed transactions
Ratings
Reports
Removed listings
Messaging behavior
Cancellation behavior
Duplicate content
```

Trust scores should initially remain internal.

---

# 39. Admin Console

Admin console is mandatory.

Main modules:

```text
Dashboard
Users
Listings
Categories
Moderation
Reports
Messages
Locations
Notifications
Featured Listings
Analytics
Configuration
Audit Logs
```

---

# 40. Admin Dashboard

Metrics:

```text
Registered Users
Active Users
Listings Created
Active Listings
Free Listings
Sold Listings
New Conversations
Reports
Removed Listings
DAU
MAU
```

Charts:

```text
Listings Over Time
User Growth
Top Categories
Top Locations
Moderation Volume
```

---

# 41. User Administration

Admins can:

```text
Search users
View profile
View listings
View reports
Suspend account
Ban account
Restore account
Verify account
Add admin notes
```

Sensitive operations must generate audit logs.

---

# 42. Listing Administration

Admins can:

```text
Search listings
Filter listings
Edit category
Remove listing
Restore listing
Feature listing
Review moderation history
```

---

# 43. Moderation Queue

Moderators should see:

```text
Listing
Images
Seller
Moderation flags
Automated moderation result
Previous violations
Reports
```

Actions:

```text
Approve
Reject
Remove
Escalate
Warn Seller
Suspend Seller
```

---

# 44. Role-Based Access Control

Suggested roles:

```text
USER
MODERATOR
SUPPORT
ADMIN
SUPER_ADMIN
```

Future:

```text
BUSINESS_SELLER
```

Permissions should use RBAC rather than hardcoded role conditions throughout the application.

---

# 45. Analytics

Track marketplace funnel:

```text
Home View
Search
Listing View
Favorite
Message Seller
Offer
Reservation
Sold
```

Key marketplace metrics:

```text
Active Listings
Listings Per Seller
Listing → Message Conversion
Message → Sold Conversion
Average Time To First Message
Average Time To Sale
Buyer/Seller Ratio
Search Success Rate
Zero Result Search Rate
```

---

# 46. Marketplace Liquidity Metrics

Important metrics:

### Supply

```text
New listings/day
Active listings
Unique sellers
```

### Demand

```text
Searches/day
Listing views
Buyer conversations
```

### Liquidity

```text
% Listings Receiving Message
Median Time To First Message
% Listings Sold
Median Time To Sale
```

These metrics are more important than raw registration numbers.

---

# 47. Monetization

Do not monetize ordinary listings initially.

Phase 2 monetization:

```text
Featured Listing
Listing Boost
Top-of-Category Placement
Seller Subscription
Business Seller Accounts
Sponsored Categories
Advertising
```

Potential later revenue:

```text
Delivery Commission
Payment Fee
Buyer Protection Fee
Escrow Fee
```

---

# 48. Listing Boost

Seller may purchase:

```text
Boost for 24 hours
Boost for 3 days
Boost for 7 days
```

Boosts influence visibility but should never completely override relevance.

---

# 49. Payment Architecture

Initial marketplace transactions should happen externally.

Examples:

```text
Cash on collection
Bank transfer
Mobile wallet
```

The platform should initially avoid holding funds.

Future payment providers may include local mobile-wallet or banking integrations.

Design payment interfaces generically.

Example:

```text
PaymentProvider
PaymentTransaction
PaymentIntent
```

---

# 50. Delivery

Delivery is not required for MVP.

Future integration:

```text
Seller requests delivery
Buyer confirms address
Courier receives request
Tracking displayed
```

Use abstract delivery provider interfaces.

---

# 51. AI Features

AI should reduce friction rather than exist as a gimmick.

Initial AI features:

### AI Listing Assistant

From photos and optional notes generate:

```text
Title
Category
Description
Condition
Keywords
Suggested Attributes
```

### AI Search Assistance

Understand queries such as:

```text
cheap laptop near me
ကလေးစက်ဘီး ရှာပေး
iPhone 13 under 1 million
free furniture Yangon
```

### Moderation Assistance

AI evaluates:

```text
spam
prohibited items
fraud signals
unsafe content
```

Final moderation decisions for uncertain cases should remain human-reviewed.

---

# 52. AI Price Suggestion

Phase 2.

Use comparable marketplace listings.

Inputs:

```text
Category
Brand
Model
Condition
Location
Age
Recent similar listings
```

Output:

```text
Suggested Range:
350,000–420,000 MMK
```

Never force the seller to use the suggested price.

---

# 53. Recommendations

MVP recommendation algorithm:

```text
Location
Category affinity
Recency
Popularity
```

Phase 2:

```text
Collaborative filtering
Behavioral signals
Embeddings
Personalized ranking
```

---

# 54. Product Pages

Public pages:

```text
/
 /search
 /category/[slug]
 /listing/[slug-or-id]
 /seller/[id]
 /free
```

Authentication:

```text
/login
/register
/verify
```

User:

```text
/account
/account/listings
/account/messages
/account/favorites
/account/profile
/account/settings
```

Selling:

```text
/sell
/sell/[draftId]
```

Admin:

```text
/admin
/admin/users
/admin/listings
/admin/reports
/admin/moderation
/admin/categories
/admin/locations
/admin/config
```

---

# 55. Recommended Technical Stack

## Frontend

Recommended:

```text
Next.js
TypeScript
React
Tailwind CSS
shadcn/ui
```

Reasons:

- Strong SEO.
- Server rendering.
- Fast ecosystem.
- Good developer productivity.
- Easy PWA path.

---

# 56. Backend

Recommended:

```text
Next.js API layer
or
NestJS
```

For initial product simplicity:

```text
Next.js application
+
separate worker processes
```

As the platform grows:

```text
Web
API
Worker
Search
Messaging
```

can be separated.

---

# 57. Database

Recommended:

```text
PostgreSQL
```

Extensions:

```text
pg_trgm
PostGIS
pgvector
```

Purpose:

```text
pg_trgm → fuzzy search
PostGIS → geographic search
pgvector → semantic search / AI
```

---

# 58. Cache

Recommended:

```text
Redis
```

Use cases:

```text
Sessions
Rate limiting
Search cache
Recommendation cache
Job queue
Presence
```

---

# 59. Object Storage

Use S3-compatible storage.

Options:

```text
AWS S3
Cloudflare R2
Backblaze B2
MinIO
RustFS
```

Store:

```text
Listing images
Profile images
Moderation evidence
```

---

# 60. Image Processing

On upload:

```text
Validate MIME
Strip metadata
Resize
Compress
Generate thumbnails
Convert WebP/AVIF
Moderate image
```

Use asynchronous processing.

---

# 61. Background Jobs

Use job queue.

Recommended:

```text
BullMQ
Redis
```

Jobs:

```text
Image processing
Notifications
Search indexing
Moderation
AI analysis
Listing expiration
Recommendation updates
Email
SMS
```

---

# 62. Real-Time Messaging

Recommended:

```text
WebSocket
```

Options:

```text
Socket.IO
native WebSocket
Ably
Pusher
Supabase Realtime
```

At initial scale, Socket.IO is sufficient.

---

# 63. Search Service Evolution

Phase 1:

```text
Postgres
```

Phase 2:

```text
Typesense
or
Meilisearch
```

Phase 3:

```text
OpenSearch
```

Search implementation should use a provider abstraction.

---

# 64. Architecture

Recommended high-level design:

```text
Browser / PWA
      │
      ▼
Next.js Web Application
      │
      ▼
Application API
 ┌────┼─────────┬───────────┐
 ▼    ▼         ▼           ▼
DB   Redis    Storage     Search
 │     │         │           │
 ▼     ▼         ▼           ▼
Postgres Queue   R2/S3    Search Engine
            │
            ▼
          Worker
            │
       ┌────┼──────┐
       ▼    ▼      ▼
      AI  SMS    Push
```

---

# 65. Core Database Entities

Core entities:

```text
User
UserProfile
UserRole
UserVerification

Listing
ListingImage
ListingAttribute
ListingView
Favorite

Category
CategoryAttribute

Location

Conversation
ConversationParticipant
Message

Offer

Rating
Report
Block

Notification

ModerationCase
ModerationAction

SearchEvent

AuditLog
```

---

# 66. Example User Schema

```text
User
-----
id
phone
email
passwordHash
status
createdAt
updatedAt
lastLoginAt
```

Profile:

```text
UserProfile
-----------
userId
displayName
avatarUrl
bio
defaultLocationId
```

Verification:

```text
UserVerification
----------------
userId
phoneVerified
emailVerified
identityVerified
```

---

# 67. Example Listing Schema

```text
Listing
-------
id
sellerId
categoryId
locationId

title
description

listingType
condition

price
currency

status

latitude
longitude

publishedAt
expiresAt
soldAt

createdAt
updatedAt
```

---

# 68. Listing Images

```text
ListingImage
------------
id
listingId
url
thumbnailUrl
position
width
height
moderationStatus
```

---

# 69. Category Attribute Schema

```text
CategoryAttribute
-----------------
id
categoryId
name
type
required
searchable
filterable
```

Possible types:

```text
TEXT
NUMBER
BOOLEAN
ENUM
DATE
```

Values:

```text
ListingAttributeValue
---------------------
listingId
attributeId
value
```

---

# 70. Conversation Schema

```text
Conversation
------------
id
listingId
createdAt
updatedAt
```

```text
ConversationParticipant
-----------------------
conversationId
userId
lastReadMessageId
```

---

# 71. Message Schema

```text
Message
-------
id
conversationId
senderId
type
body
createdAt
deletedAt
```

Message types:

```text
TEXT
IMAGE
OFFER
SYSTEM
LOCATION
```

---

# 72. Offer Schema

```text
Offer
-----
id
listingId
conversationId
buyerId
sellerId
amount
currency
status
expiresAt
createdAt
```

---

# 73. Favorites Schema

```text
Favorite
--------
userId
listingId
createdAt
```

Unique constraint:

```text
(userId, listingId)
```

---

# 74. Rating Schema

```text
Rating
------
id
reviewerId
revieweeId
listingId
score
comment
createdAt
```

---

# 75. Report Schema

```text
Report
------
id
reporterId
targetType
targetId
reason
description
status
createdAt
```

Target types:

```text
USER
LISTING
MESSAGE
```

---

# 76. Audit Logs

Administrative actions must be logged.

```text
AuditLog
--------
actorId
action
entityType
entityId
before
after
ipAddress
createdAt
```

---

# 77. API Design

Suggested REST structure:

```text
/api/auth/*
/api/users/*
/api/listings/*
/api/categories/*
/api/search/*
/api/messages/*
/api/conversations/*
/api/offers/*
/api/favorites/*
/api/reports/*
/api/admin/*
```

---

# 78. Example Listing APIs

```text
POST   /api/listings
GET    /api/listings/:id
PATCH  /api/listings/:id
DELETE /api/listings/:id

POST   /api/listings/:id/publish
POST   /api/listings/:id/reserve
POST   /api/listings/:id/sold
POST   /api/listings/:id/renew
```

---

# 79. Search API

Example:

```http
GET /api/search?q=iphone&city=yangon&condition=GOOD
```

Response:

```json
{
  "items": [],
  "pagination": {},
  "facets": {}
}
```

---

# 80. Security

Implement:

```text
HTTPS
Secure cookies
CSRF protection
Input validation
Parameterized queries
Content Security Policy
Rate limiting
Bot protection
OTP abuse prevention
Upload validation
RBAC
Audit logging
```

---

# 81. Rate Limits

Examples:

```text
Login attempts
OTP requests
Messages/minute
Listings/day
Reports/day
Search requests
Image uploads
```

Limits should depend on account trust.

---

# 82. Privacy

Never publicly expose:

```text
Phone numbers
Email addresses
IP addresses
Exact residential address
Exact seller coordinates
Private messages
```

Users should be able to:

```text
Download account data
Delete account
Deactivate account
Delete listings
```

---

# 83. SEO

Public listing pages should be server rendered.

SEO requirements:

```text
Canonical URLs
OpenGraph
Twitter cards
Structured data
Sitemap
Robots.txt
Dynamic metadata
```

Listing URLs:

```text
/listing/samsung-43-smart-tv-abc123
```

---

# 84. Social Sharing

Allow listings to share to:

```text
Facebook
Messenger
Telegram
Viber
WhatsApp
Copy Link
```

Social sharing can be particularly important for organic growth.

---

# 85. Localization

Initial languages:

```text
Myanmar
English
```

Future:

```text
Shan
Thai
Chinese
```

All UI strings must come from translation files.

Do not hardcode text throughout components.

---

# 86. Currency

Initial currency:

```text
MMK
```

Database should still support currency codes.

Example:

```text
currency = MMK
```

Use integer storage where practical.

---

# 87. Performance Targets

Target:

```text
LCP < 2.5 seconds
API p95 < 500 ms
Search response < 500 ms
```

Images should lazy load.

Use CDN caching.

---

# 88. Availability

Initial target:

```text
99.5%
```

Later:

```text
99.9%
```

---

# 89. Backups

Database:

```text
Daily backup
Point-in-time recovery preferred
```

Retention:

```text
7 daily
4 weekly
3 monthly
```

Object storage should use redundancy.

---

# 90. Observability

Implement:

```text
Application logs
Error tracking
Metrics
Tracing
Health checks
```

Recommended:

```text
Sentry
OpenTelemetry
Grafana
Prometheus
```

At minimum use:

```text
Sentry
Structured logs
Health endpoints
```

---

# 91. Feature Flags

Feature flags should control features such as:

```text
Offers
AI Listing Assistant
Map Search
Boosts
Ratings
Business Sellers
Payments
Delivery
```

This prevents code branches and risky deployments.

---

# 92. Deployment

Initial deployment can use:

```text
Docker
Coolify
```

Services:

```text
web
worker
postgres
redis
object storage
```

A reverse proxy such as Traefik can manage TLS.

---

# 93. Environment Separation

Maintain:

```text
Local
Development
Staging
Production
```

Production secrets must never be committed to Git.

---

# 94. CI/CD

GitHub Actions:

```text
Lint
Typecheck
Unit Test
Build
Migration Check
Security Scan
Deploy
```

Production deployment should follow successful checks.

---

# 95. Testing Strategy

Required:

### Unit Tests

```text
Services
Utilities
Validation
Permissions
```

### Integration Tests

```text
Listings
Messaging
Authentication
Search
Moderation
```

### End-to-End

Critical journeys:

```text
Register
Create Listing
Search
Message Seller
Reserve
Mark Sold
Report Listing
```

Use Playwright.

---

# 96. Accessibility

Target WCAG 2.1 AA.

Requirements:

```text
Keyboard navigation
Screen reader compatibility
Contrast
Alt text
Focus management
Accessible forms
```

---

# 97. MVP

MVP should include:

```text
Authentication
Phone verification
User profiles

Categories
Listings
Images
Locations
Search
Filters

Free items
Favorites

Messaging

Seller listing management

Basic reporting
Basic moderation

Admin dashboard

Myanmar + English

Responsive PWA
```

---

# 98. MVP Explicitly Excluded

Do not build initially:

```text
Property
Cars
Jobs
Services
Payments
Escrow
Delivery
Auction
Business Shops
Subscriptions
Advanced AI recommendations
Advanced map search
```

---

# 99. Phase 2

Introduce:

```text
Offers
Ratings
Push notifications
AI listing assistant
AI price suggestions
Improved recommendations
Listing boosts
Map browsing
Saved searches
Search alerts
Image messages
Business seller beta
```

---

# 100. Phase 3

Introduce:

```text
Integrated payments
Buyer protection
Delivery integration
Escrow
Business subscriptions
Advanced fraud detection
Personalized feeds
Native apps
```

---

# 101. Future Marketplace Expansion

The architecture should support new verticals without redesign.

Possible verticals:

```text
Vehicles
Property
Jobs
Services
Pets
```

Each may require specialized listing schemas layered on top of the generic marketplace model.

Example:

```text
Listing
+
VehicleAttributes
```

instead of replacing the base Listing entity.

---

# 102. Example Buyer Journey

```text
Open homepage
 ↓
Search "iPhone 13"
 ↓
Filter Yangon + price
 ↓
Open listing
 ↓
View seller profile
 ↓
Message seller
 ↓
Negotiate
 ↓
Seller reserves item
 ↓
Meet locally
 ↓
Seller marks sold
 ↓
Buyer leaves rating
```

---

# 103. Example Seller Journey

```text
Open Sell
 ↓
Upload images
 ↓
AI suggests listing
 ↓
Seller adjusts details
 ↓
Select Sanchaung
 ↓
Publish
 ↓
Receive messages
 ↓
Accept buyer
 ↓
Reserve
 ↓
Meet
 ↓
Mark Sold
```

---

# 104. Example Giveaway Journey

```text
Seller chooses Give Away
 ↓
Uploads chair photo
 ↓
Writes description
 ↓
Selects township
 ↓
Publishes
 ↓
Appears in Free section
 ↓
Buyer messages
 ↓
Seller reserves
 ↓
Buyer collects
 ↓
Seller marks completed
```

---

# 105. Product Success Criteria

Initial product-market signals:

```text
Users repeatedly return.
Listings receive messages.
Users successfully sell items.
Users create more than one listing.
Free items are collected quickly.
Marketplace supply grows organically.
```

Strong early KPI targets could be:

```text
>30% listings receive a message within 7 days
>20% listing-to-conversation conversion
>25% sellers create another listing
Increasing weekly active sellers
Increasing successful marketplace interactions
```

Exact targets should be revised using real data.

---

# 106. North Star Metric

Recommended North Star Metric:

> **Successful Marketplace Connections per Week**

A successful marketplace connection could initially mean:

```text
unique buyer-seller conversation
+
meaningful interaction
```

Later use:

```text
confirmed transaction
```

once transaction completion can be reliably measured.

---

# 107. Product Identity

Core message:

> Buy. Sell. Give Away.

Secondary message:

> Find useful things near you.

The brand should communicate:

```text
Local
Simple
Affordable
Trustworthy
Community-oriented
```

---

# 108. Product Differentiation

The product should not simply compete with Facebook Marketplace by existing.

Its advantages should be:

### Better Search

Structured categories and proper filters.

### Better Local Discovery

Township-oriented discovery.

### Better Myanmar Support

Burmese-native UX and search.

### Easier Selling

AI-assisted listing creation.

### Better Trust

Profiles, verification, moderation, reporting.

### Dedicated Free Marketplace

Giveaways receive prominent visibility.

### Less Noise

No unrelated social feed.

---

# 109. Critical Marketplace Principle

The most important problem is not software complexity.

It is marketplace liquidity.

The product only becomes valuable when:

```text
buyers find useful inventory
and
sellers receive meaningful buyer interest
```

Therefore early product strategy should focus on a small geographic area.

Recommended launch:

```text
Yangon
```

rather than attempting nationwide coverage immediately.

After achieving sufficient density:

```text
Yangon
→ Mandalay
→ Naypyidaw
→ Other cities
```

The application may technically support all Myanmar locations from day one, while acquisition remains city-focused.

---

# 110. Recommended Initial Build Order

## Sprint 1 — Foundation

```text
Project setup
Authentication
Database
RBAC
Localization
Locations
Categories
```

## Sprint 2 — Listings

```text
Create listing
Edit listing
Photo upload
Seller listings
Listing detail
```

## Sprint 3 — Marketplace

```text
Homepage
Search
Filters
Category browse
Free items
Favorites
```

## Sprint 4 — Messaging

```text
Conversations
Messages
Unread count
Notifications
```

## Sprint 5 — Trust & Safety

```text
Reports
Blocking
Moderation
Admin users
Admin listings
Audit logs
```

## Sprint 6 — Production Readiness

```text
SEO
PWA
Analytics
Performance
Monitoring
Security
Backups
Testing
```

## Sprint 7 — AI

```text
AI listing assistant
AI category detection
AI description generation
AI moderation assistance
```

---

# 111. Definition of MVP Complete

The MVP is considered complete when a new user can:

1. Register.
2. Verify their phone number.
3. Browse listings.
4. Search in Burmese or English.
5. Filter by category and location.
6. Create a listing with photos.
7. Publish it.
8. Receive a buyer message.
9. Chat with the buyer.
10. Reserve an item.
11. Mark the item sold.
12. Save listings.
13. Browse free items.
14. Report abusive content.

And administrators can:

1. Manage users.
2. Manage categories.
3. Manage locations.
4. Review reports.
5. Moderate listings.
6. Suspend users.
7. View marketplace metrics.
8. Review audit logs.

---

# 112. Engineering Principle

The codebase should be built as a **modular monolith** first.

Recommended domains:

```text
auth
users
listings
categories
locations
search
messaging
offers
favorites
moderation
notifications
admin
analytics
ai
```

Do not introduce microservices prematurely.

Each domain should have explicit boundaries so individual services can later be extracted if scale demands it.

---

# 113. Final Product Scope

The first release should answer one simple consumer question:

> “I have something I want to sell, buy, or give away locally. Where can I do it easily?”

The application should become the structured local commerce layer that Myanmar currently lacks between informal Facebook posts, groups, messaging applications, and traditional e-commerce.

The first product should therefore optimize for:

```text
Fast listing creation
High-quality search
Local discovery
Easy buyer/seller communication
Trust
Marketplace liquidity
```

Everything else should remain secondary until these behaviors are working successfully.