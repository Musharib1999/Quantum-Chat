# Future Scope - Experimental & Secondary Modules

This document tracks the modules that have been moved to the "Future Scope" section of the Admin Dashboard. These modules are currently hidden from the primary navigation to maintain a clean production environment, but they can be toggled back on for development and testing.

## Hidden Modules

| Module Name | Identifier | Status | Purpose |
|:---|:---|:---|:---|
| **Stock Debugger** | `stock_debug` | Experimental | Advanced debugging tools for stock search and data ingestion. |
| **Analytics** | `analytics` | Placeholder | Future usage statistics and query insight dashboard. |
| **Shot Logs** | `experiments` | Secondary | Detailed logs for low-level quantum circuit execution. |
| **News Blocklist** | `news_blocklist` | Internal | Managing blocked sources for the News Integration module. |
| **Market Prompts** | `market_prompts` | Experimental | Specific system prompts for financial market analysis scenarios. |
| **Enterprise Streams** | `enterprise_streams` | In-Progress | Configuring real-time data streams for enterprise clients. |
| **Use Cases** | `use_cases` | Secondary | Management of industry-specific demo scenarios. |

---

## How to Unhide

To re-enable these modules in the UI:
1. Navigate to the **Admin Dashboard**.
2. Look at the bottom of the **Sidebar**.
3. Click the **"Show Future Scope"** button.
4. The modules will appear in an **Experimental** section at the bottom of the navigation menu.

> [!NOTE]
> The toggle state is persistent (saved in `localStorage`), so it will remember your preference across browser sessions.

---

## Technical Details

- **Sidebar Configuration**: [AdminSidebar.tsx](file:///Users/musharibsubhani/.gemini/antigravity/playground/prime-blazar/src/components/admin/AdminSidebar.tsx)
- **Dashboard Routing**: [page.tsx](file:///Users/musharibsubhani/.gemini/antigravity/playground/prime-blazar/src/app/admin/dashboard/page.tsx)
- **State Logic**: Uses `showFutureScope` state and `localStorage` key `qg_admin_show_future`.
