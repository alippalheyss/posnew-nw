# Graph Report - sleepymeerkatglow-main  (2026-11-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1083 nodes · 4411 edges · 82 communities (52 shown, 30 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `228cce88`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 78

## God Nodes (most connected - your core abstractions)
1. `cn()` - 293 edges
2. `react` - 106 edges
3. `Button` - 102 edges
4. `DialogContent` - 85 edges
5. `Input` - 83 edges
6. `DialogTitle` - 82 edges
7. `DialogHeader()` - 80 edges
8. `DialogDescription` - 78 edges
9. `useAppContext()` - 75 edges
10. `showSuccess()` - 72 edges

## Surprising Connections (you probably didn't know these)
- `CommandShortcut()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/command.tsx → src/lib/utils.ts
- `AlertDialogFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert-dialog.tsx → src/lib/utils.ts
- `Pagination()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/pagination.tsx → src/lib/utils.ts
- `PaginationEllipsis()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/pagination.tsx → src/lib/utils.ts

## Import Cycles
- 2-file cycle: `src/context/AppContext.tsx -> src/services/telegramService.ts -> src/context/AppContext.tsx`
- 2-file cycle: `src/components/BankNotificationsDialog.tsx -> src/context/AppContext.tsx -> src/components/BankNotificationsDialog.tsx`

## Communities (82 total, 30 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (99): react-i18next, xlsx, App(), queryClient, BankNotificationsDialog(), CustomerAddDialog(), CustomerDisplayOfferDialog(), ExcelImportDialog() (+91 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (53): @radix-ui/react-slider@^1.2.0, class-variance-authority, lucide-react, @radix-ui/react-slider, react, react-router-dom, AmbientBackground, BankAlertPill() (+45 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (41): date-fns, jspdf, jspdf-autotable, react-day-picker, InvoiceViewDialog(), InvoiceViewDialogProps, SaleEditDialogProps, Calendar() (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (44): AccordionContent, AccordionItem, AccordionTrigger, CardFooter, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (41): dependencies, class-variance-authority@^0.7.1, date-fns@^3.6.0, @hookform/resolvers@^3.9.0, i18next@^25.7.4, jsbarcode@^3.12.3, jspdf@^4.0.0, jspdf-autotable@^5.0.7 (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (31): devDependencies, autoprefixer@^10.4.20, electron-builder@^26.15.3, eslint@^9.9.0, @eslint/js@^9.9.0, eslint-plugin-react-hooks@^5.1.0-rc.0, eslint-plugin-react-refresh@^0.4.9, globals@^15.9.0 (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (27): BANK_WEBHOOK_ROW_ID, BankNotificationsDialogProps, AccountingSettings, AppContext, AppContextType, Cart, Expense, ExpenseCategory (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (23): PosShortcutSettings(), PosShortcutSettingsProps, RESERVED_COMBOS, ActiveAuditSession, AuditEntry, mergeAuditSessions(), mergeProductItems(), playBeep() (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (28): SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (29): author, axios@^1.13.2, clsx@^2.1.1, embla-carousel-react@^8.3.0, framer-motion@^13.4.4, qrcode.react@^4.2.0, @radix-ui/react-checkbox@^1.1.1, @radix-ui/react-radio-group@^1.2.0 (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (25): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (21): GoogleIcon(), OnlineImageSearchDialogProps, ProductFlavour, OnlineProductImage, saveOnlineImageToBucket(), searchProductImages(), DICTIONARY, PHONETIC_MAP (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.21
Nodes (24): answerCallbackQuery(), calculateExecutiveBriefingData(), checkAndLinkCustomerLive(), deleteTelegramWebhook(), ExecutiveBriefingData, formatExecutiveBriefingMessage(), formatNearExpiryClearanceBroadcastMessage(), forwardSlipToTelegramGroup() (+16 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (20): AddCreditSaleDialog(), AddCreditSaleDialogProps, NewCreditSale, CustomerAddDialogProps, NearExpiryBroadcastDialogProps, TelegramConnectDialogProps, Command, CommandDialog() (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (18): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (15): background_color, categories, description, display, display_override, icons, id, name (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (14): Props, PWAInstallButton(), Separator, CustomerDisplayOffer, Database, Admin(), BOT_COMMANDS, DEFAULT_TELEGRAM_BOT_TOKEN (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (15): build, appId, directories, files, nsis, productName, win, output (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (14): compilerOptions, allowJs, baseUrl, forceConsistentCasingInFileNames, noImplicitAny, noUnusedLocals, noUnusedParameters, paths (+6 more)

### Community 22 - "Community 22"
Cohesion: 0.19
Nodes (13): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (8): initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, resources, updateSW

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (7): { privateKey, publicKey }, __dirname, indexPath, mainPath, modifiedHtml, originalHtml, rootDir

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (4): corsHeaders, getGroupOrOwnerChatId(), getTelegramGroupConfig(), supabase

### Community 26 - "Community 26"
Cohesion: 0.23
Nodes (10): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (11): scripts, build, build:dev, build:vercel, dev, electron:build, electron:build:arm64, electron:build:x64 (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.27
Nodes (10): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent, getPayloadConfigFromPayload() (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (9): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.28
Nodes (8): @supabase/supabase-js@^2.93.2, @supabase/supabase-js, backupDir, main(), [rawUrl, rawKey], restoreImages(), restoreTable(), supabase

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (8): @dyad-sh/react-vite-component-tagger@^0.8.0, vite@^6.3.4, vite-plugin-pwa@^1.3.0, @vitejs/plugin-react-swc@^3.9.0, @dyad-sh/react-vite-component-tagger, vite, vite-plugin-pwa, @vitejs/plugin-react-swc

### Community 32 - "Community 32"
Cohesion: 0.28
Nodes (4): crc32(), createPNG(), makeChunk(), publicDir

### Community 33 - "Community 33"
Cohesion: 0.36
Nodes (8): clearStore(), deleteStoreItem(), getStoreAll(), openDatabase(), putStoreBatch(), putStoreItem(), StoreName, STORES

### Community 34 - "Community 34"
Cohesion: 0.43
Nodes (7): forwardSlipToGroup(), getTelegramFileUrl(), getTelegramGroupConfig(), handler(), saveTelegramGroupConfig(), sendTelegramMessage(), supabase

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 37 - "Community 37"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (4): { app, BrowserWindow, ipcMain, globalShortcut, Menu }, gotTheLock, path, url

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (6): next-themes@^0.3.0, sonner@^1.5.0, next-themes, sonner, Toaster(), ToasterProps

### Community 40 - "Community 40"
Cohesion: 0.43
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 41 - "Community 41"
Cohesion: 0.33
Nodes (5): adminPath, content, fs, path, sections

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (6): useTheme(), AppContextProvider(), formatAutoTransferToCreditMessage(), formatPoliteCreditReminderMessage(), sendAutomatedCreditReminder(), sendAutoTransferToCreditNotification()

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (3): LlamaConfig, LlamaResponse, LlamaService

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (5): buildCommand, framework, headers, outputDirectory, rewrites

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (4): files, fs, path, walkSync()

### Community 47 - "Community 47"
Cohesion: 0.40
Nodes (4): fs, html, indexPath, path

### Community 49 - "Community 49"
Cohesion: 0.50
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 50 - "Community 50"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 52 - "Community 52"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, electron@^45.0.0, electron

### Community 53 - "Community 53"
Cohesion: 0.50
Nodes (3): Avatar, AvatarFallback, AvatarImage

### Community 54 - "Community 54"
Cohesion: 0.50
Nodes (3): TabsContent, TabsList, TabsTrigger

## Knowledge Gaps
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 13`, `Community 15`, `Community 18`, `Community 22`, `Community 26`, `Community 28`, `Community 29`, `Community 35`, `Community 36`, `Community 37`, `Community 40`, `Community 49`, `Community 50`, `Community 53`, `Community 54`, `Community 57`?**
  _High betweenness centrality (0.234) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1302884075861295 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 15`, `Community 18`, `Community 22`, `Community 23`, `Community 26`, `Community 28`, `Community 29`, `Community 35`, `Community 36`, `Community 37`, `Community 40`, `Community 49`, `Community 50`, `Community 53`, `Community 54`, `Community 57`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.058254963427377224 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `Community 30` to `Community 9`, `Community 34`, `Community 1`, `Community 6`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06787330316742081 - nodes in this community are weakly interconnected._