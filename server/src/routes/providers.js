module.exports = async function providerRoutes(fastify) {

  // GET /providers/dom-selectors
  fastify.get('/providers/dom-selectors', async () => {
    return {
      success: true,
      data: {
        chatgpt: {
          name: 'ChatGPT',
          status: 'active',
          base_url: 'https://chatgpt.com',
          config_version: 1,
          selectors: {
            composer: {
              selectors: ['#prompt-textarea', 'div[contenteditable="true"][data-id]', 'div[contenteditable="true"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            submit_button: {
              selectors: ['button[data-testid="send-button"]', 'button[aria-label="Send prompt"]', 'button[aria-label="Send message"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            stop_button: {
              selectors: ['button[aria-label="Stop streaming"]', 'button[data-testid="stop-button"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            new_chat_button: {
              selectors: ['a[data-testid="create-new-chat-button"]', 'nav a[href="/"]', 'button[aria-label="New chat"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            open_menu: {
              selectors: ['[data-testid="conversation-options-button"]', 'button[aria-haspopup="menu"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            delete_chat_menu_item: {
              selectors: ['[data-testid="delete-chat-menu-item"]', 'li[role="menuitem"]'],
              text_match: 'Delete', attribute: null, icon_text: null, button_text: null,
            },
            model_switcher_button: {
              selectors: ['button[id*="model"]', '[data-testid="model-switcher"]', 'button[aria-haspopup="menu"][class*="model"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            generated_image: {
              selectors: ['img[alt*="Generated"]', 'img[src*="oaiusercontent"]'],
              text_match: null, attribute: 'src', icon_text: null, button_text: null,
            },
            thinking_indicator: {
              selectors: ['[data-testid="thinking-indicator"]', '.thinking', '[class*="thinking"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            generating_indicator: {
              selectors: ['[data-testid="generating"]', '.result-streaming', '[class*="streaming"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            cloudflare_iframe: {
              selectors: ['iframe[src*="cloudflare"]', 'iframe[title*="challenge"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
          },
        },
        grok: {
          name: 'Grok',
          status: 'active',
          base_url: 'https://grok.com',
          config_version: 1,
          selectors: {
            composer: {
              selectors: ['textarea[placeholder]', 'div[contenteditable="true"]', 'textarea'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            submit_button: {
              selectors: ['button[aria-label="Send message"]', 'button[type="submit"]', 'button[data-testid="send-button"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            stop_button: {
              selectors: ['button[aria-label="Stop"]', 'button[data-testid="stop-button"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            ratio_button: {
              selectors: ['button[aria-label*="ratio"]', '[class*="ratio"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            open_menu: {
              selectors: ['button[aria-haspopup="menu"]', 'button[aria-label*="menu"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            cloudflare_iframe: {
              selectors: ['iframe[src*="cloudflare"]', 'iframe[title*="challenge"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            cloudflare_turnstile: {
              selectors: ['[class*="turnstile"]', 'input[name="cf-turnstile-response"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            result_container: {
              selectors: ['[class*="message"]', '[data-testid*="message"]', 'article'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            back_button: {
              selectors: ['button[aria-label="Back"]', 'a[href*="/i/grok"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            imagine_link: {
              selectors: ['a[href*="imagine"]', 'a[href*="grok/i"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
          },
        },
        gemini: {
          name: 'Gemini',
          status: 'active',
          base_url: 'https://gemini.google.com',
          config_version: 1,
          selectors: {
            composer: {
              selectors: ['rich-textarea div[contenteditable]', 'div[contenteditable="true"]', 'p[contenteditable]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            submit_button: {
              selectors: ['button[aria-label="Send message"]', 'button.send-button', 'button[mattooltip*="Send"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            stop_button: {
              selectors: ['button[aria-label="Stop response"]', 'button.stop-button'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            add_button: {
              selectors: ['button[aria-label="Add files and more"]', 'button[aria-label*="Upload"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            conversation_actions_menu: {
              selectors: ['button[aria-label*="More options"]', 'button[aria-label*="options"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            delete_menu_item: {
              selectors: ['[role="menuitem"]'],
              text_match: 'Delete', attribute: null, icon_text: null, button_text: null,
            },
            delete_confirm_button: {
              selectors: ['button[data-mat-dialog-close]', 'mat-dialog-container button'],
              text_match: 'Delete', attribute: null, icon_text: null, button_text: null,
            },
            cloudflare_iframe: {
              selectors: ['iframe[src*="cloudflare"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
          },
        },
        flow: {
          name: 'Google Flow',
          status: 'active',
          base_url: 'https://labs.google/fx/tools/flow',
          config_version: 6,
          selectors: {
            // Slate.js rich text editor for prompts
            slate_editor: {
              selectors: ['[data-slate-editor="true"]', 'div[contenteditable="true"][data-slate-editor]', 'div[contenteditable="true"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Submit/Generate button — found by Material Symbol icon text 'arrow_forward'
            submit_button: {
              selectors: ['button[aria-label="Generate"]', 'button[aria-label="Run"]', 'button[type="submit"]'],
              text_match: null, attribute: null, icon_text: 'arrow_forward', button_text: null,
            },
            stop_button: {
              selectors: ['button[aria-label="Stop"]', 'button[aria-label="Cancel"]', 'button[aria-label="Stop generating"]'],
              text_match: null, attribute: null, icon_text: 'stop', button_text: null,
            },
            // Settings button (tune/crop icon)
            settings_button: {
              selectors: ['button[aria-label="Settings"]', 'button[aria-label="Image settings"]'],
              text_match: null, attribute: null, icon_text: 'tune', button_text: null,
            },
            // Generated image tile container
            tile_container: {
              selectors: ['[data-tile-id]', 'div[data-tile-id]', 'li[data-tile-id]'],
              text_match: null, attribute: 'data-tile-id', icon_text: null, button_text: null,
            },
            // Material Symbols icon element selector
            icon_element: {
              selectors: ['i.google-symbols', '.google-symbols', 'span.google-symbols', '[class*="google-symbols"]', 'i[class*="material"]', 'span[class*="material"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Download button on tile
            download_button: {
              selectors: ['button[aria-label="Download"]', 'button[aria-label="Save"]'],
              text_match: null, attribute: null, icon_text: 'download', button_text: null,
            },
            // More options menu on tile
            tile_menu_button: {
              selectors: ['button[aria-label="More options"]', 'button[aria-label="Options"]'],
              text_match: null, attribute: null, icon_text: 'more_vert', button_text: null,
            },
            // New project button
            new_project_button: {
              selectors: ['button', '[role="button"]'],
              text_match: ['New project', 'Dự án mới', 'Create new project'],
              icon_text: ['add_2', 'add', 'add_circle'], attribute: null, button_text: null,
            },
            // Project name input
            project_name_input: {
              selectors: ['input[aria-label*="project"]', 'input[placeholder*="project"]', 'input[type="text"]'],
              aria_labels: ['Project name', 'Name', 'Tên dự án'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Flow agent toggle button (for AI Flow mode)
            flow_agent_toggle_button: {
              selectors: ['button[aria-label*="agent"]', 'button[aria-label*="Agent"]', 'button[aria-label*="Flow"]'],
              text_match: null, attribute: null, icon_text: 'smart_toy', button_text: null,
            },
            // Flow chat agent close button
            flow_chat_agent_close_button: {
              selectors: ['button[aria-label="Close"]', 'button[aria-label="Dismiss"]'],
              text_match: null, attribute: null, icon_text: 'close', button_text: null,
            },
            // Flow agent instruction done button
            flow_agent_instruction_done_button: {
              selectors: ['button[aria-label="Done"]', 'button[aria-label="Confirm"]'],
              text_match: ['Done', 'Xong', 'OK'],
              attribute: null, icon_text: null, button_text: null,
            },
            // Right-click context menu on tile
            context_menu: {
              selectors: ['[role="menu"]', 'ul[role="menu"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Menu items inside context menu / dropdown
            menu_item: {
              selectors: ['[role="menuitem"]', 'li[role="menuitem"]', 'button[role="menuitem"]', '[role="menuitemradio"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // "Add to prompt" menu item — matched by text content
            add_to_prompt_menu_item: {
              selectors: ['[role="menuitem"]'],
              text_match: ['Add to prompt', 'Thêm vào câu lệnh', 'Thêm vào', 'Use as reference', 'Dùng làm tham chiếu', 'Add'],
              attribute: null, icon_text: null, button_text: null,
            },
            // Video element inside a video tile
            tile_video: {
              selectors: ['video', 'video[src]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Image element inside an image tile
            tile_image: {
              selectors: ['img', 'img[src]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Warning/error icon on failed tiles
            warning_icon: {
              selectors: ['i.google-symbols', '.google-symbols', 'span.google-symbols', 'span[class*="symbol"]'],
              text_match: 'warning',
              attribute: null, icon_text: 'warning', button_text: null,
            },
            // Generic tab button (quantity x1/x2/x3/x4, mode tabs, etc.)
            tab_button_generic: {
              selectors: ['button[role="tab"]', '[role="tab"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Video mode - Frames tab (2 keyframes)
            video_mode_frames: {
              selectors: ['button[role="tab"][aria-controls*="VIDEO_FRAMES"]', 'button[role="tab"][id*="VIDEO_FRAMES"]', 'button[role="tab"]'],
              text_match: ['Frames', 'Khung hình'],
              attribute: null, icon_text: null, button_text: null,
            },
            // Video mode - Ingredients tab (ref images)
            video_mode_ingredients: {
              selectors: ['button[role="tab"][aria-controls*="VIDEO_REFERENCES"]', 'button[role="tab"][id*="VIDEO_REFERENCES"]', 'button[role="tab"]'],
              text_match: ['Ingredients', 'Thành phần'],
              attribute: null, icon_text: null, button_text: null,
            },
            // Video duration tabs (4s, 6s, 8s, 10s)
            video_duration_tab: {
              selectors: ['button[role="tab"]', '[role="tab"]'],
              text_match: ['4s', '6s', '8s', '10s'],
              attribute: null, icon_text: null, button_text: null,
            },
            // Model picker/selector button
            model_picker_button: {
              selectors: ['button[aria-haspopup="menu"]', 'button[aria-haspopup="listbox"]', '[aria-haspopup="menu"]:not([aria-label*="Setting"])'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Retry button on failed tile
            tile_retry_button: {
              selectors: ['button[aria-label*="Retry"]', 'button[aria-label*="Thử lại"]', 'button[aria-label*="retry"]', 'button[aria-label*="Regenerate"]'],
              text_match: null, attribute: null, icon_text: 'refresh', button_text: null,
            },
            // Project link (tile → project page)
            project_link: {
              selectors: ['a[href*="/project/"]', 'a[href*="/fx/"]'],
              text_match: null, attribute: 'href', icon_text: null, button_text: null,
            },
            // Edit link
            edit_link: {
              selectors: ['a[href*="/edit"]', 'a[aria-label*="Edit"]', 'a[aria-label*="Chỉnh sửa"]'],
              text_match: null, attribute: 'href', icon_text: null, button_text: null,
            },
            // Settings panel candidate containers (what could be the settings panel)
            settings_panel_candidates: {
              selectors: ['[data-radix-popper-content-wrapper]', '[role="menu"]', '[role="dialog"]', '[data-radix-menu-content]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Settings panel marker (unique element inside settings panel)
            settings_panel_marker: {
              selectors: ['[data-radix-menu-content]', '[role="menu"][data-state="open"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Main scroll container
            flow_scroll_container: {
              selectors: ['main', '[class*="scroll"]', '[class*="content"]', 'div[style*="overflow"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Modal dialog
            flow_modal_dialog: {
              selectors: ['[role="dialog"]', '[data-radix-dialog-content]', '[aria-modal="true"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Toggle/switch buttons (for enabling details view, etc.)
            flow_tab_slider_trigger: {
              selectors: ['button[role="switch"]', '[role="switch"]', 'button[aria-checked]', 'button[role="checkbox"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Grid view tab in Flow gallery
            grid_view_tab: {
              selectors: ['button[aria-label*="grid"]', 'button[aria-label*="Grid"]', '[role="tab"][aria-label*="grid"]'],
              aria_labels: ['Grid view', 'Chế độ xem lưới', 'Grid'],
              text_match: null, attribute: null, icon_text: 'grid_view', button_text: null,
            },
            // "Show tile details" setting row
            show_tile_details_setting: {
              selectors: ['[role="row"]', 'div[class*="setting"]', 'label'],
              text_match: ['Show tile details', 'Hiển thị chi tiết', 'Details', 'Chi tiết'],
              attribute: null, icon_text: null, button_text: null,
            },
            // Toggle state button (on/off)
            toggle_state_button: {
              selectors: ['button[role="switch"]', 'button[aria-checked]'],
              aria_labels_on: ['On', 'Bật', 'Enabled', 'True'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Download menu trigger (⋮ three-dot on tile)
            download_menu_trigger: {
              selectors: ['button[aria-label*="More"]', 'button[aria-label*="options"]', 'button[aria-label*="Khác"]', 'button[aria-label*="Thêm"]'],
              text_match: null, attribute: null, icon_text: 'more_vert', button_text: null,
            },
            // Download submenu (inside tile options menu)
            download_submenu: {
              selectors: ['[role="menu"]', '[role="listbox"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Download submenu item
            download_submenu_item: {
              selectors: ['[role="menuitem"]'],
              text_match: ['Download', 'Tải xuống', 'Save', 'Lưu'],
              attribute: null, icon_text: 'download', button_text: null,
            },
            // Advanced settings menu button (gear/tune icon)
            composer_advanced_menu_button: {
              selectors: ['button[aria-label*="Advanced"]', 'button[aria-label*="Nâng cao"]', 'button[aria-label*="Settings"]'],
              text_match: null, attribute: null, icon_text: 'tune', button_text: null,
            },
            // Voices tab in advanced menu
            advanced_menu_voices_tab: {
              selectors: ['[role="tab"][aria-label*="Voice"]', '[role="tab"][aria-label*="Giọng"]', 'button[role="tab"]'],
              text_match: ['Voice', 'Voices', 'Giọng nói', 'Giọng'],
              attribute: null, icon_text: 'voice_selection', button_text: null,
            },
            // Voice name element in advanced menu voice list
            advanced_menu_voice_name_div: {
              selectors: ['[class*="voice-name"]', '[class*="voiceName"]', 'h3', 'strong', '[class*="name"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Voice description element
            advanced_menu_voice_description_div: {
              selectors: ['[class*="voice-desc"]', '[class*="description"]', 'p', '[class*="subtitle"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // Currently selected voice button in prompt bar
            prompt_selected_voice_button: {
              selectors: ['button[aria-label*="voice"]', 'button[class*="voice"]', 'button[aria-label*="Voice"]'],
              text_match: null, attribute: null, icon_text: null, button_text: null,
            },
            // "Add to prompt" button inside advanced menu
            advanced_menu_add_to_prompt_button: {
              selectors: ['button[aria-label*="Add"]', 'button[aria-label*="Thêm"]'],
              text_match: ['Add', 'Thêm', 'Insert', 'Apply'],
              attribute: null, icon_text: null, button_text: null,
            },
            // Video upload confirm dialog buttons
            video_upload_confirm: {
              selectors: ['[role="dialog"] button', 'button[aria-label*="Confirm"]', 'button[aria-label*="Continue"]'],
              text_match: ['Confirm', 'Continue', 'OK', 'Tiếp tục', 'Xác nhận'],
              attribute: null, icon_text: null, button_text: null,
            },
            // Credit limit / quota alert
            flow_credit_limit_alert: {
              selectors: ['[role="alert"]', '[role="dialog"]', '[aria-live="assertive"]'],
              text_match: ['credit', 'limit', 'quota', 'Giới hạn', 'Hết'],
              attribute: null, icon_text: null, button_text: null,
            },
          },
          // Also expose as dom_selectors for background.js compatibility
          dom_selectors: {
            new_project_button: {
              selectors: ['button', '[role="button"]'],
              text_match: ['New project', 'Dự án mới', 'Create new project'],
              icon_text: ['add_2', 'add', 'add_circle'],
            },
          },
        },
      },
    };
  });

  // GET /provider-models
  fastify.get('/provider-models', async () => {
    return {
      success: true,
      data: [
        // Flow image models
        { id: 1, provider: 'flow', media_type: 'image', name: 'Nano Banana 2', value: 'Nano Banana 2', is_default: true,  is_premium: false, required_feature_key: null, min_extension_version: null, sort_order: 1, config: null },
        { id: 2, provider: 'flow', media_type: 'image', name: 'Nano Banana Pro', value: 'Nano Banana Pro', is_default: false, is_premium: false, required_feature_key: null, min_extension_version: null, sort_order: 2, config: null },
        // Flow video models
        { id: 3, provider: 'flow', media_type: 'video', name: 'Veo 3.1 - Fast', value: 'Veo 3.1 - Fast', is_default: true,  is_premium: false, required_feature_key: null, min_extension_version: null, sort_order: 1,
          config: { max_ref_images: { image: 3 }, duration_overrides: [{ when: { has_ref: true, input_type: 'Ingredients' }, force_duration: '8s' }] } },
        { id: 4, provider: 'flow', media_type: 'video', name: 'Veo 3.1 - Lite', value: 'Veo 3.1 - Lite', is_default: false, is_premium: false, required_feature_key: null, min_extension_version: null, sort_order: 2,
          config: { max_ref_images: { image: 3 }, duration_overrides: [{ when: { has_ref: true, input_type: 'Ingredients' }, force_duration: '8s' }] } },
        { id: 5, provider: 'flow', media_type: 'video', name: 'Veo 3.1 - Quality', value: 'Veo 3.1 - Quality', is_default: false, is_premium: false, required_feature_key: null, min_extension_version: null, sort_order: 3,
          config: { supports_ref_images: false, max_ref_images: { image: 0 }, ref_support_overrides: [{ when: { input_type: 'Ingredients' }, supported: false, reason: 'Veo Quality Ingredients không hỗ trợ ref' }] } },
        { id: 6, provider: 'flow', media_type: 'video', name: 'Omni Flash', value: 'Omni Flash', is_default: false, is_premium: true, required_feature_key: 'gen_enabled', min_extension_version: null, sort_order: 4,
          config: { supports_ref_video: true, max_ref_images: { image: 7, video: 1, total: 7 }, duration_overrides: [{ when: { has_ref_video: true }, force_duration: '10s' }] } },
      ],
      meta: { version: 'v1.0' },
    };
  });

  // GET /providers/api-configs
  fastify.get('/providers/api-configs', async () => {
    return {
      success: true,
      data: {
        chatgpt: {
          config_version: 1,
          configs: {
            ratios: {
              image: [
                { ui_name: 'square', value: '1:1' },
                { ui_name: 'portrait', value: '3:4' },
                { ui_name: 'story', value: '9:16' },
                { ui_name: 'landscape', value: '16:9' },
              ],
              video: [
                { ui_name: 'square', value: '1:1' },
                { ui_name: 'portrait', value: '9:16' },
                { ui_name: 'landscape', value: '16:9' },
              ],
            },
            download_resolutions: {
              image: [
                { value: '1080p', label: '1080p', menu_label: '1080p', pixel_width: 1080 },
                { value: '720p', label: '720p', menu_label: '720p', pixel_width: 720 },
              ],
              video: [
                { value: '720p', label: '720p', menu_label: '720p' },
              ],
              image_fallback_chain: ['1080p', '720p'],
              video_fallback_chain: ['720p'],
            },
            error_patterns: {
              rate_limit_error_text: 'rate limit|quota exceeded|too many requests|You.ve reached',
              content_blocked_text: "content policy|I'm not able to|cannot create|not allowed",
              image_gen_failed_text: 'generation failed|error creating|failed to generate',
              network_error_text: 'network error|connection failed|timeout',
              cloudflare_challenge_text: 'challenge|cloudflare|verification',
            },
            ui_text_patterns: {
              delete_menu_text: 'Delete',
              generated_image_alt_text: 'Generated image|DALL',
            },
            max_ref_images: { image: 5, video: 3 },
            supports: {
              ratio: true,
              quantity: true,
              video: false,
              ref_image: true,
              auto_download: true,
              humanized: true,
              image_mode: true,
            },
            quantity_range: { min: 1, max: 4 },
            ratio_ui_map: { square: '1:1', portrait: '3:4', story: '9:16', landscape: '16:9' },
            ratio_aria_labels: {
              square: 'Square', portrait: 'Portrait', story: 'Story', landscape: 'Landscape',
            },
            urls: {
              base: 'https://chatgpt.com',
              tab_query: '*://chatgpt.com/*',
              tab_query_patterns: ['*://chatgpt.com/*'],
              create_url: 'https://chatgpt.com',
              cdn_patterns: ['oaiusercontent.com'],
            },
          },
        },
        grok: {
          config_version: 1,
          configs: {
            ratios: {
              image: [
                { ui_name: 'square', value: '1:1' },
                { ui_name: 'portrait', value: '9:16' },
                { ui_name: 'landscape', value: '16:9' },
              ],
              video: [
                { ui_name: 'portrait', value: '9:16' },
                { ui_name: 'landscape', value: '16:9' },
              ],
            },
            error_patterns: {
              rate_limit_text: 'rate limit|quota|too many',
              content_blocked_text: 'content policy|not allowed',
              network_error_text: 'network error|connection|timeout',
              cloudflare_challenge_text: 'cloudflare|challenge',
            },
            max_ref_images: { image: 4, video: 2 },
            supported_durations: ['5s', '10s'],
            supported_resolutions: ['480p', '720p'],
            supported_image_qualities: ['speed', 'quality'],
            supports: {
              ratio: true,
              quantity: false,
              video: true,
              ref_image: true,
              auto_download: true,
              humanized: false,
              image_mode: true,
            },
            quantity_range: null,
            urls: {
              base: 'https://grok.com',
              tab_query: '*://grok.com/*',
              tab_query_patterns: ['*://grok.com/*', 'https://*.grok.com/*'],
              create_url: 'https://grok.com',
              cdn_patterns: ['grok-content', 'pbs.twimg.com', 'video.twimg.com'],
            },
          },
        },
        gemini: {
          config_version: 1,
          configs: {
            ratios: {
              image: [
                { value: '1:1' },
                { value: '3:4' },
                { value: '9:16' },
                { value: '16:9' },
              ],
              video: null,
            },
            error_patterns: {
              network_error_text: 'network error|connection failed',
              content_blocked_text: 'content policy|not allowed|cannot generate',
            },
            max_ref_images: { image: 3 },
            supports: {
              ratio: false,
              quantity: false,
              video: false,
              ref_image: true,
              auto_download: false,
              humanized: false,
              image_mode: false,
            },
            quantity_range: null,
            urls: {
              base: 'https://gemini.google.com',
              tab_query: '*://gemini.google.com/*',
              tab_query_patterns: ['*://gemini.google.com/*'],
              create_url: 'https://gemini.google.com',
              cdn_patterns: ['googleusercontent.com', 'lh3.googleusercontent.com'],
            },
          },
        },
        flow: {
          config_version: 1,
          configs: {
            ratios: {
              image: ['1:1', '3:4', '9:16', '16:9', '4:3', '2:3'],
              video: ['1:1', '9:16', '16:9'],
            },
            download_resolutions: {
              image: [
                { value: 'original', label: 'Original', menu_label: 'Original', pixel_width: null },
                { value: '4K', label: '4K', menu_label: '4K', pixel_width: 2160 },
                { value: '2K', label: '2K', menu_label: '2K', pixel_width: 1440 },
                { value: '1K', label: '1K', menu_label: '1K', pixel_width: 1080 },
              ],
              video: [
                { value: '1080p', label: '1080p', menu_label: '1080p' },
                { value: '720p', label: '720p', menu_label: '720p' },
              ],
              image_fallback_chain: ['original', '4K', '2K', '1K'],
              video_fallback_chain: ['1080p', '720p'],
            },
            image_url_pattern: {
              url_substring: 'getMediaUrlRedirect',
            },
            max_ref_images: { image: 5, video_ingredients: 10 },
            video_durations: {
              default: ['4s', '6s', '8s'],
              advanced: ['4s', '6s', '8s', '10s'],
              fixed: ['8s'],
            },
            supports: {
              ratio: true,
              quantity: true,
              video: true,
              ref_image: true,
              auto_download: true,
              humanized: true,
              image_mode: true,
            },
            quantity_range: { min: 1, max: 4 },
            urls: {
              base: 'https://labs.google/fx/tools/flow',
              tab_query: 'https://labs.google/fx/*',
              tab_query_patterns: ['https://labs.google/fx/*'],
              create_url: 'https://labs.google/fx/tools/flow',
              locale_base: 'https://labs.google/fx',
              cdn_patterns: ['googleusercontent.com', 'storage.googleapis.com'],
            },
          },
        },
      },
    };
  });
};
