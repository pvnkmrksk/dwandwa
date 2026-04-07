import { syncWordInputFonts } from './text.js';

const dict = {
  en: {
    tagline: '3D Shadow Illusion Sculptor',
    ph_front: 'Right-view word',
    ph_side: 'Left-view word',
    pad: 'Pad',
    generate: 'Generate sculpture',
    upload_font: '+ Font',
    pixel_editor: 'Pixel Editor',
    pixel_editor_desc: 'join islands · manual edits',
    view_left: 'Right view',
    view_right: 'Left view',
    upload_mid: 'Font',
    upload_font_title: 'Upload custom TTF, OTF, or WOFF font',
    front_sil: 'Right silhouette',
    side_sil: 'Left silhouette',
    erase: 'Erase',
    clear: 'Clear',
    fill: 'Fill',
    undo: 'Undo',
    feather: 'Feather',
    brush: 'Brush',
    resolution: 'Resolution',
    apply_edits: 'Apply Edits',
    modules: 'modules',
    cam_front: 'Front',
    cam_left: 'Left',
    cam_right: 'Right',
    cam_side: 'Side',
    cam_iso: 'Iso',
    cam_spin: 'Spin',
    paint_struts: 'Paint Struts',
    clear_pins: 'Clear',
    undo_pins: 'Undo',
    base: 'Base',
    back_panel: 'Back panel',
    gap: 'Gap',
    advanced: 'Advanced layout & plate',
    align_backs: 'Align backs',
    equal_gaps: 'Equal gaps',
    wall_struts: 'Wall struts',
    variable_width: 'Variable width',
    local_fonts: 'Local fonts (bundled)',
    mesh_snap_base: 'Snap mesh to base',
    plate_section: 'Plate footprint & thickness',
    pad_x: 'Pad X',
    pad_z: 'Pad Z',
    thickness: 'Thickness',
    round: 'Round',
    overlap_base: 'Overlap base',
    back_section: 'Back panel',
    pad_height: 'Pad height',
    overlap_back: 'Overlap back',
    strut_size: 'Strut size',
    export_1x: '1\u00d7 draft',
    export_2x: '2\u00d7 good',
    export_4x: '4\u00d7 fine',
    export_8x: '8\u00d7 print',
    export_stl: 'Export STL',
    export_note: 'Smoothed dual-view mesh \u00b7 includes painted struts & pixel edits',
    ft_hint: 'Gap scales per-column span in default layout. Turn on Equal gaps to space by measured width; Gap\u00a0% then scales the gap between blocks. Align backs flushes each letter\u2019s rear to one plane.',
    help_title: 'How to Use',
    help_s1t: 'Enter Your Words',
    help_s1: 'Two words, one per column. Each letter pair is one 3D block; shorter words are padded automatically.',
    help_s2t: 'Choose Fonts',
    help_s2: 'Pick from Kannada, Devanagari, Tamil, Telugu and more. Upload any custom TTF/OTF/WOFF with \u201c+ Font\u201d.',
    help_s3t: 'Generate',
    help_s3: 'The 3D model updates after you pause typing (~2 s), when you scroll the page, or when you tap Generate.',
    bmsg_compose: 'Type in the large word fields. The 3D model updates after you pause typing (~2 s), when you scroll the page, or when you tap Generate.',
    help_s4t: 'Pixel Editor',
    help_s4: 'Expand to paint or erase silhouette pixels. Connect floating islands for printability. Feather softens edges.',
    help_s5t: '3D Preview',
    help_s5: 'Drag to orbit; scroll or pinch to zoom. Front is straight-on. The two angled camera buttons match the two word colors (blue vs orange). Spin slowly rocks between those views.',
    help_s6t: 'Paint Struts',
    help_s6: 'Click on the model to place support pins \u2014 struts connect to the back wall. Drag to reposition, Shift+click to remove.',
    help_s7t: 'Structure',
    help_s7: 'Toggle Base & Back panel. Open Advanced for plate thickness, gaps, overlap, and strut sizing.',
    help_s8t: 'Export STL',
    help_s8: 'Choose 1\u00d7\u20138\u00d7 resolution. Includes pixel edits & painted struts. Base sits flat on the print bed.',
    toolbar_lang: 'Language',
    toolbar_theme: 'Theme',
    theme_light: 'Light',
    theme_dark: 'Dark',
    hint_zoom: 'Drag to orbit \u00b7 Scroll wheel or pinch with two fingers to zoom',
    help_intro: 'Dwandwa turns two words into one dual-view 3D sculpture: what you read from the front differs from what you read from the side. Work top to bottom: words, optional pixel edits, 3D preview, then export.',
    help_s9t: 'Pad character',
    help_s9: 'When one word is shorter, the pad symbol fills the gap so every column has both a front and a side glyph. Pick a heart/star or type your own in the tiny box.',
    help_s10t: 'Resolution & performance',
    help_s10: 'Resolution sets voxel detail for preview and editing. Phones default lower for speed; wide desktops default to 128. The slider waits until you pause before rebuilding. Export multiplier (1\u00d7\u20138\u00d7) is separate and can be higher than preview.',
    help_s11t: 'Advanced & struts',
    help_s11: 'Below the preview, open Advanced for plate padding, overlap, strut thickness, and strut embed depth (lower = shallower into the letters, fewer exit holes). Enable Wall struts for automatic back supports, or use Paint struts on the toolbar for custom pins.',
    strut_embed: 'Strut embed',
    section_words: 'Words & fonts',
    composer_dual_hint:
      'Each label names the viewing angle for that word in the 3D preview (not always left/right on screen). On narrow layouts the two columns can reorder visually; the first field is always word 1 and the second is word 2.',
    footer_credit: 'Made with \u2764\ufe0f by ',
    share_link: 'Copy share link',
    share_copied: 'Share link copied to clipboard.',
    share_failed: 'Could not copy link. Copy from the address bar.',
    share_url_too_long: 'Link is too long to copy safely; try a shorter word or lower resolution.',
    section_editor: 'Pixel editor',
    section_preview: '3D preview',
    section_help: 'How to use',
    tip_switch_en: 'Switch to English',
    tip_switch_kn: 'Switch to Kannada',
    lang_btn_english: 'English',
    lang_btn_kannada: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1',
    font_col_front: 'Font — front word',
    font_col_side: 'Font — side word',
    pad_custom_option: 'Custom\u2026',
    cam_debug_hint: 'Add ?debug=1 to the URL for a live camera readout. In the console: dwandwaCamera.getPose(), dwandwaCamera.animate(from, to, ms).',
    help_tour: 'Quick tour',
    tutorial_next: 'Next',
    tutorial_done: 'Done',
    tutorial_skip: 'Skip',
  },
  kn: {
    tagline: '3D \u0CA8\u0CC6\u0CB0\u0CB3\u0CC1 \u0CAD\u0CCD\u0CB0\u0CAE\u0CC6 \u0CB6\u0CBF\u0CB2\u0CCD\u0CAA\u0CBF',
    ph_front: '\u0CAC\u0CB2 \u0CA8\u0CCB\u0C9F\u0CA6 \u0CAA\u0CA6',
    ph_side: '\u0C8E\u0CA1 \u0CA8\u0CCB\u0C9F\u0CA6 \u0CAA\u0CA6',
    pad: '\u0CAD\u0CB0\u0CCD\u0CA4\u0CBF',
    generate: '\u0CB0\u0C9A\u0CBF\u0CB8\u0CBF',
    upload_font: '+ \u0CAB\u0CBE\u0C82\u0C9F\u0CCD',
    pixel_editor: '\u0C9A\u0CBF\u0CA4\u0CCD\u0CB0 \u0CB8\u0C82\u0CAA\u0CBE\u0CA6\u0C95',
    pixel_editor_desc: '\u0CA6\u0CCD\u0CB5\u0CC0\u0CAA\u0C97\u0CB3\u0CA8\u0CCD\u0CA8\u0CC1 \u0CB8\u0CC7\u0CB0\u0CBF\u0CB8\u0CBF · \u0C95\u0CC8\u0CAF\u0CBF\u0C82\u0CA6 \u0CB8\u0C82\u0CAA\u0CBE\u0CA6\u0CA8\u0CC6',
    view_left: '\u0CAC\u0CB2 \u0CA8\u0CCB\u0C9F',
    view_right: '\u0C8E\u0CA1 \u0CA8\u0CCB\u0C9F',
    upload_mid: '\u0CAB\u0CBE\u0C82\u0C9F\u0CCD',
    upload_font_title: '\u0C95\u0CB8\u0CCD\u0C9F\u0CAE\u0CCD \u0CAB\u0CBE\u0C82\u0C9F\u0CCD \u0C85\u0CAA\u0CCD\u200C\u0CB2\u0CCB\u0CA1\u0CCD (TTF/OTF/WOFF)',
    front_sil: '\u0CAC\u0CB2 \u0CA8\u0CC6\u0CB0\u0CB3\u0CC1',
    side_sil: '\u0C8E\u0CA1 \u0CA8\u0CC6\u0CB0\u0CB3\u0CC1',
    erase: '\u0C85\u0CB3\u0CBF\u0CB8\u0CC1',
    clear: '\u0CA4\u0CC6\u0C97\u0CC6',
    fill: '\u0CA4\u0CC1\u0C82\u0CAC\u0CC1',
    undo: '\u0CB9\u0CBF\u0C82\u0CA6\u0C95\u0CCD\u0C95\u0CC6',
    feather: '\u0CAE\u0CC3\u0CA6\u0CC1',
    brush: '\u0C95\u0CC1\u0C82\u0C9A',
    resolution: '\u0CB8\u0CC2\u0C95\u0CCD\u0CB7\u0CCD\u0CAE\u0CA4\u0CC6',
    apply_edits: '\u0CB8\u0C82\u0CAA\u0CBE\u0CA6\u0CA8\u0CC6 \u0C85\u0CA8\u0CCD\u0CB5\u0CAF\u0CBF\u0CB8\u0CBF',
    modules: '\u0C98\u0C9F\u0C95\u0C97\u0CB3\u0CC1',
    cam_front: '\u0CAE\u0CC1\u0C82\u0CA6\u0CC6',
    cam_left: '\u0C8E\u0CA1',
    cam_right: '\u0CAC\u0CB2',
    cam_side: '\u0CAA\u0C95\u0CCD\u0C95',
    cam_iso: '\u0CAE\u0CC2\u0CB2\u0CC6',
    cam_spin: '\u0CA4\u0CBF\u0CB0\u0CC1\u0C97\u0CC1',
    paint_struts: '\u0C86\u0CA7\u0CBE\u0CB0 \u0CAC\u0CA3\u0CCD\u0CA3\u0CBF\u0CB8\u0CBF',
    clear_pins: '\u0CA4\u0CC6\u0C97\u0CC6',
    undo_pins: '\u0CB9\u0CBF\u0C82\u0CA6\u0C95\u0CCD\u0C95\u0CC6',
    base: '\u0CAC\u0CC1\u0CA8\u0CBE\u0CA6\u0CBF',
    back_panel: '\u0CB9\u0CBF\u0C82\u0CAC\u0CA6\u0CBF',
    gap: '\u0C85\u0C82\u0CA4\u0CB0',
    advanced: '\u0CB8\u0CC1\u0CA7\u0CBE\u0CB0\u0CBF\u0CA4 \u0CB5\u0CBF\u0CA8\u0CCD\u0CAF\u0CBE\u0CB8 & \u0CA4\u0C9F\u0CCD\u0C9F\u0CC6',
    align_backs: '\u0CB9\u0CBF\u0C82\u0CAD\u0CBE\u0C97 \u0C9C\u0CCB\u0CA1\u0CBF\u0CB8\u0CBF',
    equal_gaps: '\u0CB8\u0CAE \u0C85\u0C82\u0CA4\u0CB0',
    wall_struts: '\u0C97\u0CCB\u0CA1\u0CC6 \u0C86\u0CA7\u0CBE\u0CB0',
    variable_width: '\u0CAC\u0CA6\u0CB2\u0CBE\u0C97\u0CC1\u0CB5 \u0C85\u0C97\u0CB2',
    local_fonts: '\u0CB8\u0CCD\u0CA5\u0CB3\u0CC0\u0caf \u0CAB\u0CBE\u0C82\u0C9F\u0CCD\u0C97\u0CB3\u0CC1 (\u0CAA\u0CCD\u0CD5\u0C95\u0CC7\u0C9C\u0CCD)',
    mesh_snap_base: '\u0CAC\u0CC1\u0CA8\u0CBE\u0CA6\u0CBF\u0C97\u0CC6 \u0CB9\u0CCB\u0C82\u0CA6\u0CBF\u0CB8\u0CBF (Y)',
    plate_section: '\u0CA4\u0C9F\u0CCD\u0C9F\u0CC6 \u0C85\u0CB3\u0CA4\u0CC6 & \u0CA6\u0CAA\u0CCD\u0CAA',
    pad_x: 'X \u0CB9\u0CC6\u0C9A\u0CCD\u0C9A\u0CC1\u0CB5\u0CB0\u0CBF',
    pad_z: 'Z \u0CB9\u0CC6\u0C9A\u0CCD\u0C9A\u0CC1\u0CB5\u0CB0\u0CBF',
    thickness: '\u0CA6\u0CAA\u0CCD\u0CAA',
    round: '\u0CA6\u0CC1\u0C82\u0CA1\u0CC1',
    overlap_base: '\u0CAC\u0CC1\u0CA8\u0CBE\u0CA6\u0CBF \u0C85\u0CA4\u0CBF\u0C95\u0CCD\u0CB0\u0CAE',
    back_section: '\u0CB9\u0CBF\u0C82\u0CAC\u0CA6\u0CBF \u0CA4\u0C9F\u0CCD\u0C9F\u0CC6',
    pad_height: '\u0C8E\u0CA4\u0CCD\u0CA4\u0CB0 \u0CB9\u0CC6\u0C9A\u0CCD\u0C9A\u0CC1\u0CB5\u0CB0\u0CBF',
    overlap_back: '\u0CB9\u0CBF\u0C82\u0CAC\u0CA6\u0CBF \u0C85\u0CA4\u0CBF\u0C95\u0CCD\u0CB0\u0CAE',
    strut_size: '\u0C86\u0CA7\u0CBE\u0CB0 \u0C97\u0CBE\u0CA4\u0CCD\u0CB0',
    export_1x: '1\u00d7 \u0C95\u0CB0\u0CA1\u0CC1',
    export_2x: '2\u00d7 \u0C89\u0CA4\u0CCD\u0CA4\u0CAE',
    export_4x: '4\u00d7 \u0CB8\u0CC2\u0C95\u0CCD\u0CB7\u0CCD\u0CAE',
    export_8x: '8\u00d7 \u0CAE\u0CC1\u0CA6\u0CCD\u0CB0\u0CA3',
    export_stl: 'STL \u0CB0\u0CAB\u0CCD\u0CA4\u0CC1',
    export_note: '\u0CAE\u0CC3\u0CA6\u0CC1 \u0C89\u0CAD\u0CAF-\u0CA8\u0CCB\u0C9F \u0C9C\u0CBE\u0CB2 \u00b7 \u0CAC\u0CA3\u0CCD\u0CA3\u0CBF\u0CB8\u0CBF\u0CA6 \u0C86\u0CA7\u0CBE\u0CB0 & \u0C9A\u0CBF\u0CA4\u0CCD\u0CB0 \u0CB8\u0C82\u0CAA\u0CBE\u0CA6\u0CA8\u0CC6 \u0C92\u0CB3\u0C97\u0CCA\u0C82\u0CA1\u0CBF\u0CA6\u0CC6',
    ft_hint: '\u0CA1\u0CC0\u0CAB\u0CBE\u0CB2\u0CCD\u0C9F\u0CCD \u0CB5\u0CBF\u0CA8\u0CCD\u0CAF\u0CBE\u0CB8\u0CA6\u0CB2\u0CCD\u0CB2\u0CBF \u0C85\u0C82\u0CA4\u0CB0 \u0CAA\u0CCD\u0CB0\u0CA4\u0CBF-\u0C95\u0CBE\u0CB2\u0CAE\u0CCD \u0CB5\u0CCD\u0CAF\u0CBE\u0CAA\u0CCD\u0CA4\u0CBF\u0CAF\u0CA8\u0CCD\u0CA8\u0CC1 \u0C85\u0CB3\u0CC6\u0CAF\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6. \u0CB8\u0CAE \u0C85\u0C82\u0CA4\u0CB0 \u0C86\u0CA8\u0CCD \u0CAE\u0CBE\u0CA1\u0CBF \u0C85\u0CB3\u0CA4\u0CC6 \u0C85\u0C97\u0CB2\u0CA6\u0CBF\u0C82\u0CA6 \u0C98\u0C9F\u0C95\u0C97\u0CB3\u0CA8\u0CCD\u0CA8\u0CC1 \u0C9C\u0CCB\u0CA1\u0CBF\u0CB8\u0CB2\u0CC1. \u0CB9\u0CBF\u0C82\u0CAD\u0CBE\u0C97 \u0C9C\u0CCB\u0CA1\u0CBF\u0CB8\u0CBF \u0CAA\u0CCD\u0CB0\u0CA4\u0CBF \u0C85\u0C95\u0CCD\u0CB7\u0CB0\u0CA6 \u0CB9\u0CBF\u0C82\u0CAD\u0CBE\u0C97\u0CB5\u0CA8\u0CCD\u0CA8\u0CC1 \u0C92\u0C82\u0CA6\u0CC7 \u0CB8\u0CAE\u0CA4\u0CB2\u0C95\u0CCD\u0C95\u0CC6 \u0C9C\u0CCB\u0CA1\u0CBF\u0CB8\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6.',
    help_title: '\u0CAC\u0CB3\u0CB8\u0CC1\u0CB5 \u0CB5\u0CBF\u0CA7\u0CBE\u0CA8',
    help_s1t: '\u0CAA\u0CA6\u0C97\u0CB3\u0CA8\u0CCD\u0CA8\u0CC1 \u0CA8\u0CAE\u0CC2\u0CA6\u0CBF\u0CB8\u0CBF',
    help_s1: '\u0C8E\u0CB0\u0CA1\u0CC1 \u0CAA\u0CA6\u0C97\u0CB3\u0CC1, \u0CAA\u0CCD\u0CB0\u0CA4\u0CBF \u0C95\u0CBE\u0CB2\u0CAE\u0CCD\u200C\u0C97\u0CC6 \u0C92\u0C82\u0CA6\u0CC1. \u0CAA\u0CCD\u0CB0\u0CA4\u0CBF \u0C85\u0C95\u0CCD\u0CB7\u0CB0 \u0C9C\u0CCB\u0CA1\u0CBF \u0C92\u0C82\u0CA6\u0CC1 3D \u0C98\u0C9F\u0C95; \u0C9A\u0CBF\u0C95\u0CCD\u0C95 \u0CAA\u0CA6\u0C97\u0CB3\u0CBF\u0C97\u0CC6 \u0CB8\u0CCD\u0CB5\u0CAF\u0C82 \u0CAD\u0CB0\u0CCD\u0CA4\u0CBF.',
    help_s2t: '\u0CAB\u0CBE\u0C82\u0C9F\u0CCD \u0C86\u0CAF\u0CCD\u0C95\u0CC6',
    help_s2: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1, \u0CA6\u0CC7\u0CB5\u0CA8\u0CBE\u0C97\u0CB0\u0CBF, \u0CA4\u0CAE\u0CBF\u0CB3\u0CC1, \u0CA4\u0CC6\u0CB2\u0CC1\u0C97\u0CC1 \u0C87\u0CA4\u0CCD\u0CAF\u0CBE\u0CA6\u0CBF \u0CB2\u0CBF\u0CAA\u0CBF\u0C97\u0CB3\u0CBF\u0C82\u0CA6 \u0C86\u0CAF\u0CCD\u0C95\u0CC6. \u201c+ \u0CAB\u0CBE\u0C82\u0C9F\u0CCD\u201d \u0C92\u0CA4\u0CCD\u0CA4\u0CBF \u0C95\u0CB8\u0CCD\u0C9F\u0CAE\u0CCD \u0CAB\u0CBE\u0C82\u0C9F\u0CCD \u0C85\u0CAA\u0CCD\u200C\u0CB2\u0CCB\u0CA1\u0CCD.',
    help_s3t: '\u0CB0\u0C9A\u0CBF\u0CB8\u0CBF',
    help_s3: '\u0C8E\u0CB3\u0CC6\u0CA6\u0CC1 \u0CA8\u0CBF\u0CB2\u0CCD\u0CB2\u0CBF\u0CB8\u0CBF\u0CA6 \u0CA8\u0C82\u0CA4\u0CB0 (\u0CB8\u0CC1\u0CAE\u0CBE\u0CB0\u0CC1 2 \u0CB8\u0CC6), \u0CAA\u0CC7\u0C9C\u0CCD \u0CB8\u0CCD\u0C95\u0CCD\u0CB0\u0CBE\u0CB2\u0CCD \u0CAE\u0CBE\u0CA1\u0CC1\u0CB5\u0CBE\u0C97, \u0C85\u0CA5\u0CB5\u0CBE \u201c\u0CB0\u0C9A\u0CBF\u0CB8\u0CBF\u201d \u0CAC\u0CC6\u0C9F\u0CCD\u0C9F\u0CAF\u0CA8\u0CCD\u0CA8\u0CC1 \u0CA4\u0CC1\u0CA1\u0CBF\u0CAF\u0CC1\u0CA4\u0CCD\u0CA4\u0CBF\u0CA6\u0CC6.',
    bmsg_compose: '\u0C8E\u0CB0\u0CA1\u0CC1 \u0CAA\u0CA6\u0C97\u0CB3\u0CA8\u0CCD\u0CA8\u0CC1 \u0C8E\u0CA1\u0CBF\u0CB8\u0CBF. 3D \u0CB0\u0C9A\u0CA8\u0CC6: \u0CB8\u0CC1\u0CB2\u0CCD\u0CAA \u0CB5\u0CBF\u0CB0\u0CBE\u0CAE\u0CA6 \u0CA8\u0C82\u0CA4\u0CB0, \u0CB8\u0CCD\u0C95\u0CCD\u0CB0\u0CBE\u0CB2\u0CCD, \u0C85\u0CA5\u0CB5\u0CBE \u201c\u0CB0\u0C9A\u0CBF\u0CB8\u0CBF\u201d.',
    help_s4t: '\u0C9A\u0CBF\u0CA4\u0CCD\u0CB0 \u0CB8\u0C82\u0CAA\u0CBE\u0CA6\u0C95',
    help_s4: '\u0CA8\u0CC6\u0CB0\u0CB3\u0CC1 \u0C9A\u0CBF\u0CA4\u0CCD\u0CB0\u0C97\u0CB3\u0CA8\u0CCD\u0CA8\u0CC1 \u0CAC\u0CA3\u0CCD\u0CA3\u0CBF\u0CB8\u0CBF \u0C85\u0CA5\u0CB5\u0CBE \u0C85\u0CB3\u0CBF\u0CB8\u0CBF. \u0CA4\u0CC7\u0CB2\u0CC1\u0CB5 \u0CA6\u0CCD\u0CB5\u0CC0\u0CAA\u0C97\u0CB3\u0CA8\u0CCD\u0CA8\u0CC1 \u0CB8\u0CC7\u0CB0\u0CBF\u0CB8\u0CBF. \u0CAE\u0CC3\u0CA6\u0CC1 \u0C85\u0C82\u0C9A\u0CC1\u0C97\u0CB3\u0CA8\u0CCD\u0CA8\u0CC1 \u0CA8\u0CAF\u0CB5\u0CBE\u0C97\u0CBF\u0CB8\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6.',
    help_s5t: '3D \u0CA8\u0CCB\u0C9F',
    help_s5: '\u0C8E\u0CB3\u0CC6\u0CA6\u0CC1 \u0CA4\u0CBF\u0CB0\u0CC1\u0C97\u0CBF\u0CB8\u0CBF; \u0CB8\u0CCD\u0C95\u0CCD\u0CB0\u0CBE\u0CB2\u0CCD \u0C85\u0CA5\u0CB5\u0CBE \u0C9C\u0CC2\u0CAE\u0CCD. \u0CAE\u0CC1\u0C82\u0CA6\u0CC6 \u0CA8\u0CC7\u0CB0\u0CB5\u0CBE\u0C97\u0CBF. \u0C87\u0CB0\u0CA1\u0CC1 \u0C95\u0CCB\u0CA8\u0CC6 \u0CAC\u0C9F\u0CA8\u0CCD\u200C\u0C97\u0CB3\u0CC1 \u0CAA\u0CA6\u0C95\u0CCD\u0C95\u0CC6\u0CAF \u0CAC\u0CA3\u0CCD\u0CA3\u0CBF\u0C97\u0CB3 \u0CB9\u0CBF\u0C82\u0CA6\u0CBF\u0CA8 \u0CB9\u0CCA\u0C82\u0CA6\u0CBF\u0CB8\u0CC1\u0CA4\u0CCD\u0CA4\u0CB5\u0CC7. \u0CA4\u0CBF\u0CB0\u0CC1\u0C97\u0CC1 \u0C86 \u0C8E\u0CB0\u0CA1\u0CC1 \u0CA8\u0CCB\u0C9F\u0CB3 \u0CA8\u0CA1\u0CC1\u0CB5\u0CBF\u0CA8 \u0C85\u0CB2\u0CCD\u0CB2\u0CBE\u0C9F\u0CC1\u0C97\u0CB3 \u0CA8\u0CA1\u0CC1\u0CB5\u0CBF\u0CA8\u0CCD\u0CA8\u0CC1 \u0CAE\u0CBE\u0CA1\u0CBF\u0CA4\u0CCD\u0CA4\u0CC1.',
    help_s6t: '\u0C86\u0CA7\u0CBE\u0CB0 \u0CAC\u0CA3\u0CCD\u0CA3\u0CBF\u0CB8\u0CBF',
    help_s6: '\u0CAE\u0CBE\u0CA6\u0CB0\u0CBF \u0CAE\u0CC7\u0CB2\u0CCD\u0CAE\u0CC8 \u0CAE\u0CC7\u0CB2\u0CC6 \u0C95\u0CCD\u0CB2\u0CBF\u0C95\u0CCD \u0CAE\u0CBE\u0CA1\u0CBF \u0CAA\u0CBF\u0CA8\u0CCD \u0C87\u0CA1\u0CBF \u2014 \u0CB9\u0CBF\u0C82\u0CAC\u0CA6\u0CBF \u0C97\u0CCB\u0CA1\u0CC6\u0C97\u0CC6 \u0C86\u0CA7\u0CBE\u0CB0. \u0C8E\u0CB3\u0CC6\u0CA6\u0CC1 \u0CB8\u0CB0\u0CBF\u0CB8\u0CBF, Shift+\u0C95\u0CCD\u0CB2\u0CBF\u0C95\u0CCD \u0CA4\u0CC6\u0C97\u0CC6\u0CAF\u0CBF\u0CB0\u0CBF.',
    help_s7t: '\u0CB0\u0C9A\u0CA8\u0CC6',
    help_s7: '\u0CAC\u0CC1\u0CA8\u0CBE\u0CA6\u0CBF & \u0CB9\u0CBF\u0C82\u0CAC\u0CA6\u0CBF \u0C86\u0CA8\u0CCD/\u0C86\u0CAB\u0CCD \u0CAE\u0CBE\u0CA1\u0CBF. \u0CB8\u0CC1\u0CA7\u0CBE\u0CB0\u0CBF\u0CA4 \u0CA4\u0CC6\u0CB0\u0CC6\u0CA6\u0CC1 \u0CA6\u0CAA\u0CCD\u0CAA, \u0C85\u0C82\u0CA4\u0CB0 \u0CB8\u0CB0\u0CBF\u0CB9\u0CCA\u0C82\u0CA6\u0CBF\u0CB8\u0CBF.',
    help_s8t: 'STL \u0CB0\u0CAB\u0CCD\u0CA4\u0CC1',
    help_s8: '1\u00d7\u20138\u00d7 \u0CB8\u0CC2\u0C95\u0CCD\u0CB7\u0CCD\u0CAE\u0CA4\u0CC6 \u0C86\u0CAF\u0CCD\u0C95\u0CC6. \u0C9A\u0CBF\u0CA4\u0CCD\u0CB0 \u0CB8\u0C82\u0CAA\u0CBE\u0CA6\u0CA8\u0CC6 & \u0C86\u0CA7\u0CBE\u0CB0\u0C97\u0CB3\u0CA8\u0CCD\u0CA8\u0CC1 \u0C92\u0CB3\u0C97\u0CCA\u0C82\u0CA1\u0CBF\u0CA6\u0CC6. \u0CAC\u0CC1\u0CA8\u0CBE\u0CA6\u0CBF \u0CAE\u0CC1\u0CA6\u0CCD\u0CB0\u0CA3 \u0CA4\u0CB3\u0CA6\u0CB2\u0CCD\u0CB2\u0CBF\u0CB0\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6.',
    toolbar_lang: '\u0CAD\u0CBE\u0CB7\u0CC6',
    toolbar_theme: '\u0CA5\u0CC0\u0CAE\u0CCD',
    theme_light: '\u0CAC\u0CC6\u0CB3\u0C95\u0CC1',
    theme_dark: '\u0C95\u0CA4\u0CCD\u0CA4\u0CB2\u0CC6',
    hint_zoom: '\u0C8E\u0CB3\u0CC6\u0CA6\u0CC1 \u0CA4\u0CBF\u0CB0\u0CC1\u0C97\u0CBF\u0CB8\u0CBF \u00b7 \u0CB8\u0CCD\u0C95\u0CCD\u0CB0\u0CBE\u0CB2\u0CCD \u0C85\u0CA5\u0CB5\u0CBE \u0C8E\u0CB0\u0CA1\u0CC1 \u0CAC\u0CC6\u0CB0\u0CB3\u0CC1\u0C97\u0CB3\u0CBF\u0C82\u0CA6 \u0C9C\u0CC2\u0CAE\u0CCD',
    help_intro: '\u0CA6\u0CCD\u0CB5\u0C82\u0CA6\u0CCD\u0CB5 \u0C8E\u0CB0\u0CA1\u0CC1 \u0CAA\u0CA6\u0C97\u0CB3\u0CA8\u0CCD\u0CA8\u0CC1 \u0C92\u0C82\u0CA6\u0CC7 \u0C89\u0CAD\u0CAF-\u0CA8\u0CCB\u0C9F 3D \u0CB6\u0CBF\u0CB2\u0CCD\u0CAA\u0CB5\u0CBE\u0C97\u0CBF \u0CAE\u0CBE\u0CA1\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6: \u0CAE\u0CC1\u0C82\u0CA6\u0CC6\u0CAF\u0CBF\u0C82\u0CA6 \u0C93\u0CA6\u0CC1 \u0C92\u0C82\u0CA6\u0CC1, \u0CAA\u0C95\u0CCD\u0C95\u0CA6\u0CBF\u0C82\u0CA6 \u0C92\u0C82\u0CA6\u0CC1. \u0C95\u0CC6\u0CB3\u0C97\u0CC6 \u0C87\u0CB0\u0CC1\u0CB5 \u0C95\u0CCD\u0CB0\u0CAE\u0CA6\u0CB2\u0CCD\u0CB2\u0CBF \u0CAC\u0CB3\u0CB8\u0CBF; \u0CA6\u0CCB\u0CA1\u0CCD\u0CA1 \u0CAA\u0C9F\u0CCD\u0C9F\u0CAF\u0CB2\u0CCD\u0CB2\u0CBF \u0C9C\u0CC0\u0CB5\u0C82\u0CA4 3D \u0CA8\u0CCB\u0C9F \u0CB8\u0C82\u0CAA\u0CBE\u0CA6\u0CA8\u0CC6\u0CAF\u0CC1 \u0C95\u0CBE\u0CA3\u0CC1\u0CB5\u0CBE\u0C97\u0CBF \u0C87\u0CB0\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6.',
    help_s9t: '\u0CAD\u0CB0\u0CCD\u0CA4\u0CBF \u0C85\u0C95\u0CCD\u0CB7\u0CB0',
    help_s9: '\u0C92\u0C82\u0CA6\u0CC1 \u0CAA\u0CA6 \u0C95\u0CA1\u0CBF\u0CAE\u0CC6 \u0C87\u0CA6\u0CCD\u0CA6\u0CBF\u0CB0\u0CC1\u0CB5\u0CBE\u0C97\u0CBF\u0CA6\u0CCD\u0CA6\u0CB0\u0CC6, \u0CAD\u0CB0\u0CCD\u0CA4\u0CBF \u0C9A\u0CBF\u0CB9\u0CCD\u0CA8\u0CC6 \u0C85\u0C82\u0CA4\u0CB0\u0CB5\u0CA8\u0CCD\u0CA8\u0CC1 \u0CAD\u0CB0\u0CCD\u0CA4\u0CBF \u0CAE\u0CBE\u0CA1\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6. \u0CB9\u0CBE\u0CB0\u0CCD\u0C9F\u0CCD/\u0CA8\u0C95\u0CCD\u0CB7\u0CA4\u0CCD\u0CB0 \u0C86\u0CAF\u0CCD\u0C95\u0CC6 \u0CAE\u0CBE\u0CA1\u0CBF \u0C85\u0CA5\u0CB5\u0CBE \u0C9A\u0CBF\u0C9B\u0CC6 \u0CAA\u0CC6\u0C9F\u0CCD\u0C9F\u0CAF\u0CB2\u0CCD\u0CB2\u0CBF \u0C87\u0CB0\u0CBF\u0CB8\u0CBF.',
    help_s10t: '\u0CB8\u0CC2\u0C95\u0CCD\u0CB7\u0CCD\u0CAE\u0CA4\u0CC6 & \u0CB5\u0CC7\u0C97',
    help_s10: '\u0CB8\u0CC2\u0C95\u0CCD\u0CB7\u0CCD\u0CAE\u0CA4\u0CC6 \u0CAA\u0CCD\u0CB0\u0CB5\u0CCD\u0CAF\u0CC2 \u0CB9\u0CBE\u0C9C\u0CB0\u0CCD \u0CB5\u0CBF\u0CB5\u0CB0\u0C97\u0CB3\u0CC1 \u0CB8\u0C82\u0CAA\u0CBE\u0CA6\u0CA8\u0CC6\u0CAF\u0CC1 \u0CA8\u0CBF\u0CB0\u0CCD\u0CA7\u0CBE\u0CB0\u0CBF\u0CB8\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6. \u0CAB\u0CCB\u0CA8\u0CCD\u200C\u0C97\u0CB3\u0CC1 \u0CB5\u0CC7\u0C97\u0C95\u0CCD\u0C95\u0CBE\u0C97\u0CBF \u0C95\u0CA1\u0CBF\u0CAE\u0CC6 \u0CA1\u0CC0\u0CAB\u0CBE\u0CB2\u0CCD\u0C9F\u0CCD; \u0CA1\u0CC6\u0CB8\u0CCD\u0C95\u0CCD\u0C9F\u0CCA\u0CAA\u0CCD\u200C\u0C97\u0CB3\u0CC1 \u0CB9\u0CC6\u0C9A\u0CCD\u0C9A\u0CC1. \u0CB0\u0CAB\u0CCD\u0CA4\u0CC1 \u0C97\u0CC1\u0CA3\u0C95\u0CCD (1\u00d7\u20138\u00d7) \u0CAA\u0CCD\u0CB0\u0CA4\u0CCD\u0CAF\u0CC7\u0C95 \u0CB5\u0CC7\u0CB0\u0CA6\u0CC6 \u0CAE\u0CA4\u0CCD\u0CA4\u0CC1 \u0CAA\u0CCD\u0CB0\u0CB5\u0CCD\u0CAF\u0CC2\u0C95\u0CCD\u0CB7\u0CC6\u0CAF\u0CBF\u0C82\u0CA6 \u0CB9\u0CC6\u0C9A\u0CCD\u0C9A\u0CC1 \u0C87\u0CB0\u0CAC\u0CB9\u0CC1\u0CA6\u0CC1.',
    help_s11t: '\u0CB8\u0CC1\u0CA7\u0CBE\u0CB0\u0CBF\u0CA4 & \u0C86\u0CA7\u0CBE\u0CB0',
    help_s11: '\u0CA8\u0CCB\u0C9F\u0CCD \u0C95\u0CC6\u0CB3\u0C97\u0CC6 \u201c\u0CB8\u0CC1\u0CA7\u0CBE\u0CB0\u0CBF\u0CA4\u201d \u0CA4\u0CC6\u0CB0\u0CC6\u0CAF\u0CBF\u0C82\u0CA6 \u0CA4\u0C9F\u0CCD\u0C9F\u0CC6, \u0C85\u0CA4\u0CBF\u0C95\u0CCD\u0CB0\u0CAE, \u0C86\u0CA7\u0CBE\u0CB0 \u0CA6\u0CAA\u0CCD\u0CAA, \u0C85\u0C95\u0CCD\u0CB7\u0CB0\u0C97\u0CB3\u0CC1\u0C95\u0CCD\u0C95\u0CC6 \u0C8E\u0CB3\u0CC6\u0CA4\u0CC6 \u0C86\u0CA7\u0CBE\u0CB0 \u0C87\u0CB0\u0CC1\u0CB5\u0CBF\u0C95\u0CC6 (\u0C95\u0CA1\u0CBF\u0CAE\u0CC6 = \u0C8E\u0C9A\u0CCD\u0C9A\u0CC1) \u0CB8\u0C9C\u0CCD\u0C9C\u0CBF\u0CB8\u0CBF. \u201c\u0C97\u0CCB\u0CA1\u0CC6 \u0C86\u0CA7\u0CBE\u0CB0\u201d \u0C86\u0CA8\u0CCD \u0CAE\u0CBE\u0CA1\u0CBF \u0CB8\u0CCD\u0CB5\u0CAF\u0C82 \u0C86\u0CA7\u0CBE\u0CB0; \u0C9F\u0CC2\u0CB2\u0CCD\u0CAC\u0CBE\u0CB0\u0CCD \u201c\u0C86\u0CA7\u0CBE\u0CB0 \u0CAC\u0CA3\u0CCD\u0CA3\u0CBF\u0CB8\u0CBF\u201d \u0C87\u0C82\u0CA6 \u0C95\u0CC8\u0CAF \u0CAA\u0CBF\u0CA8\u0CCD \u0C87\u0CB0\u0CBF\u0CB8\u0CBF.',
    strut_embed: '\u0C86\u0CA7\u0CBE\u0CB0 \u0C8E\u0CB3\u0CC6\u0CA4\u0CC6',
    section_words: '\u0CAA\u0CA6\u0C97\u0CB3\u0CC1 & \u0CAB\u0CBE\u0C82\u0C9F\u0CCD',
    composer_dual_hint:
      '\u0CAA\u0CCD\u0CB0\u0CA4\u0CBF \u0C8E\u0CB0\u0CA1\u0CC1 \u0C8E\u0CB3\u0CC6\u0CAF\u0CC1 3D \u0CA8\u0CCB\u0C9F\u0CA6\u0CB2\u0CCD\u0CB2\u0CBF \u0C86 \u0CAA\u0CA6\u0CA6 \u0C8E\u0CA8\u0CCD\u0CA8 \u0C95\u0CCB\u0CA3\u0CC6\u0CAF\u0CBF\u0C82\u0CA6 \u0C95\u0CA3\u0CCD\u0CA3\u0CC1\u0CA4\u0CCD\u0CA4\u0CA6\u0CC6 (\u0C8E\u0CB2\u0CCD\u0CB2\u0CBE\u0C97\u0CC2 \u0C8E\u0CA1/\u0CAC\u0CB2 \u0C85\u0CB2\u0CCD\u0CB2). \u0C9A\u0CBF\u0C95\u0CCD\u0C95\u0CA6 \u0C9A\u0CC1\u0C9A\u0CCD\u0C9A\u0CC1\u0C97\u0CB3\u0CB2\u0CCD\u0CB2\u0CBF \u0C8E\u0CB0\u0CA1\u0CC1 \u0C95\u0CBE\u0CB2\u0CAE\u0CCD\u0C97\u0CB3 \u0CAC\u0CA6\u0CB2\u0CBE\u0C97\u0CAC\u0CB9\u0CC1\u0CA6\u0CC1; \u0CAE\u0CC6\u0CC2\u0CB2\u0CBF\u0CA8 \u0C9C\u0CBE\u0C97\u0CA6\u0CB2\u0CCD\u0CB2\u0CBF \u0CAE\u0CC6\u0CC2\u0CB2\u0CC1 \u0C8E\u0CB0\u0CA1\u0CC1 1 \u0C8E\u0CB0\u0CA1\u0CC1 2.',
    footer_credit: '\u0CAA\u0CCD\u0CB0\u0CC0\u0CA4\u0CBF\u0CAF\u0CBF\u0C82\u0CA6 \u0CA4\u0CAF\u0CBE\u0CB0\u0CBF\u0CB8\u0CBF\u0CA6\u0CCD\u0CA6\u0CC1 \u2764\ufe0f — ',
    share_link: '\u0CB9\u0CC1\u0C82\u0C9A\u0CBF\u0C95\u0CC6 \u0CB2\u0CBF\u0C82\u0C95\u0CCD \u0CA8\u0C95\u0CB2\u0CBF\u0CB8\u0CBF',
    share_copied: '\u0CB2\u0CBF\u0C82\u0C95\u0CCD \u0C95\u0CCD\u0CB2\u0CBF\u0CAA\u0CCD\u0CAC\u0CCB\u0CB0\u0CCD\u0CA1\u0CCD\u200C\u0C97\u0CC6 \u0CA8\u0C95\u0CB2\u0CBF\u0CB8\u0CB2\u0CBE\u0CAF\u0CBF\u0CA4\u0CC1.',
    share_failed: '\u0CA8\u0C95\u0CB2\u0CBF\u0CB8\u0CB2\u0CC1 \u0CB8\u0CBE\u0CA7\u0CCD\u0CAF\u0CB5\u0CBF\u0CB2\u0CCD\u0CB2. \u0CB5\u0CBF\u0CB3\u0CBE\u0CB8\u0CA6\u0CB2\u0CCD\u0CB2\u0CBF\u0C82\u0CA6 \u0CAA\u0CCD\u0CB0\u0CA4\u0CBF \u0CA8\u0CC6\u0CB0\u0CC6\u0CB5\u0CC1 \u0C85\u0CA8\u0CCD\u0CA8\u0CC1 \u0C95\u0CC6\u0CC2\u0CB0\u0CBF\u0CB8\u0CBF.',
    share_url_too_long:
      '\u0CB2\u0CBF\u0C82\u0C95\u0CCD \u0C85\u0CA4\u0CCD\u0CAF\u0C82\u0CA4 \u0CA6\u0CC2\u0CB0\u0CCD\u0CB5\u0CBE\u0C97\u0CBF\u0CA6\u0CC6; \u0C9A\u0CBF\u0C95\u0CCD\u0C95 \u0CAA\u0CA6 \u0C85\u0CA5\u0CB5\u0CBE \u0C95\u0CA1\u0CBF\u0CAE\u0CC6 \u0CB8\u0CC2\u0C95\u0CCD\u0CB7\u0CCD\u0CAE\u0CA4\u0CC6\u0CAF\u0CA8\u0CCD\u0CA8\u0CC1 \u0C95\u0CA1\u0CBF\u0CAE\u0CC6\u0CAF\u0CBF\u0CB8\u0CBF.',
    section_editor: '\u0C9A\u0CBF\u0CA4\u0CCD\u0CB0 \u0CB8\u0C82\u0CAA\u0CBE\u0CA6\u0C95',
    section_preview: '3D \u0CA8\u0CCB\u0C9F',
    section_help: '\u0CB8\u0CB9\u0CBE\u0CAF',
    tip_switch_en: 'English \u0C95\u0CCD\u0C95\u0CC6 \u0CAC\u0CA6\u0CB2\u0CBE\u0CAF\u0CBF\u0CB8\u0CBF',
    tip_switch_kn: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1\u0C95\u0CCD\u0C95\u0CC6 \u0CAC\u0CA6\u0CB2\u0CBE\u0CAF\u0CBF\u0CB8\u0CBF',
    lang_btn_english: 'English',
    lang_btn_kannada: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1',
    font_col_front: '\u0CAB\u0CBE\u0C82\u0C9F\u0CCD \u2014 \u0CAE\u0CC1\u0C82\u0CAD\u0CBE\u0C97 \u0CAA\u0CA6',
    font_col_side: '\u0CAB\u0CBE\u0C82\u0C9F\u0CCD \u2014 \u0CAA\u0C95\u0CCD\u0C95 \u0CAA\u0CA6',
    pad_custom_option: '\u0C87\u0CA4\u0CB0\u2026',
    cam_debug_hint: '?\u0C9C\u0CC0\u0CB5\u0CBF\u0CA8\u0CB2\u0CCD\u0CB2\u0CBF debug=1 \u0C9C\u0CCB\u0CA1\u0CBF\u0CB8\u0CBF. \u0C95\u0CC6\u0CB8\u0CC6\u0CB2\u0CCD: dwandwaCamera.getPose(), dwandwaCamera.animate(from, to, ms).',
    help_tour: '\u0CB8\u0CC2\u0C95\u0CCD\u0CB7\u0CCD\u0CAE \u0CAA\u0CCD\u0CB0\u0CB5\u0CBE\u0CB8',
    tutorial_next: '\u0CAE\u0CC1\u0C82\u0CA6\u0CC6',
    tutorial_done: '\u0C86\u0CAF\u0CCD\u0CA4\u0CC1',
    tutorial_skip: '\u0CAC\u0CBF\u0CA1\u0CC1',
  },
};

let currentLang = document.documentElement.lang || 'kn';

export function applyLang(lang) {
  currentLang = lang || currentLang;
  document.documentElement.lang = currentLang;
  localStorage.setItem('lang', currentLang);

  const d = dict[currentLang] || dict.en;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = d[key] ?? dict.en[key];
    if (val == null) return;
    if (el.tagName === 'OPTGROUP') el.label = val;
    else el.textContent = val;
  });

  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.dataset.i18nPh;
    const val = d[key] ?? dict.en[key];
    if (val != null) el.placeholder = val;
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    const val = d[key] ?? dict.en[key];
    if (val != null) el.setAttribute('title', val);
  });

  document.querySelectorAll('option[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = d[key] ?? dict.en[key];
    if (val != null) el.textContent = val;
  });

  syncWordInputFonts();

  const bm = document.getElementById('bmsg');
  if (bm?.dataset.composeHint === '1') {
    const hint = d.bmsg_compose ?? dict.en.bmsg_compose;
    if (hint) bm.textContent = hint;
  }

  const flip = document.getElementById('langFlip');
  const flipBtn = document.getElementById('langFlipBtn');
  if (flip && flipBtn) {
    const toEn = d.lang_btn_english ?? 'English';
    const toKn = d.lang_btn_kannada ?? '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1';
    flip.textContent = currentLang === 'kn' ? toEn : toKn;
    const tip = currentLang === 'kn' ? d.tip_switch_en : d.tip_switch_kn;
    flipBtn.setAttribute('aria-label', tip);
    flipBtn.setAttribute('title', tip);
  }
}

export function toggleLang() {
  applyLang(currentLang === 'kn' ? 'en' : 'kn');
}

export function getLang() { return currentLang; }

export function t(key) {
  const d = dict[currentLang] || dict.en;
  return d[key] ?? dict.en[key] ?? key;
}
