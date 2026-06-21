## ADDED Requirements

### Requirement: Window controls positioned on the right
The title bar SHALL render minimize, maximize/restore, and close buttons on the right side of the title bar, following Windows platform convention.

#### Scenario: Controls appear on the right
- **WHEN** the app is launched
- **THEN** the three window control buttons are flush to the right edge of the title bar

### Requirement: Windows-native button order
The buttons SHALL appear left-to-right as: minimize → maximize/restore → close.

#### Scenario: Correct order
- **WHEN** the title bar is rendered
- **THEN** the leftmost control button is minimize, the middle is maximize/restore, and the rightmost is close

### Requirement: SVG icons for window controls
Each button SHALL display an inline SVG icon: a horizontal line for minimize, a square outline for maximize, two overlapping rectangles for restore, and a diagonal-cross for close.

#### Scenario: Minimize icon
- **WHEN** the window is not maximized
- **THEN** the minimize button shows a centered horizontal line SVG

#### Scenario: Maximize icon
- **WHEN** the window is not maximized
- **THEN** the maximize button shows a square outline SVG

#### Scenario: Restore icon
- **WHEN** the window is maximized
- **THEN** the maximize/restore button shows two overlapping rectangles SVG

### Requirement: Hover feedback on window controls
Each button SHALL provide visual hover feedback. Minimize and maximize/restore SHALL darken their background on hover. Close SHALL show a brick-red background with white icon on hover.

#### Scenario: Minimize hover
- **WHEN** the user hovers over the minimize button
- **THEN** the button background changes to rgba(0,0,0,0.08)

#### Scenario: Maximize/restore hover
- **WHEN** the user hovers over the maximize/restore button
- **THEN** the button background changes to rgba(0,0,0,0.08)

#### Scenario: Close hover
- **WHEN** the user hovers over the close button
- **THEN** the button background changes to #c0392b and the icon color changes to white

#### Scenario: Hover cleared on mouse leave
- **WHEN** the user moves the mouse off a button
- **THEN** the button returns to its default transparent background

### Requirement: Live maximize/restore state tracking
The component SHALL track whether the window is currently maximized and update the maximize/restore icon accordingly, both on mount and whenever the window is resized.

#### Scenario: Initial maximized state
- **WHEN** the component mounts
- **THEN** it queries `win.isMaximized()` and sets the icon to restore if true, maximize if false

#### Scenario: State updates on resize
- **WHEN** the window is maximized or restored by the user
- **THEN** the icon switches between maximize and restore without requiring a page reload

#### Scenario: Listener cleanup
- **WHEN** the component unmounts
- **THEN** the `onResized` listener is removed

### Requirement: Settings button on the left
The settings gear button (⚙) SHALL be positioned to the left of the app title, not the right.

#### Scenario: Settings button placement
- **WHEN** the title bar is rendered
- **THEN** the settings button appears to the left of the "AI Workbench" title text

### Requirement: Settings button opens the settings modal
Clicking the settings button SHALL open the settings modal.

#### Scenario: Modal opens on click
- **WHEN** the user clicks the settings button
- **THEN** the settings modal appears over the app

### Requirement: Window draggable via title area
The window SHALL be draggable by clicking and dragging the title text area. Buttons in the title bar SHALL NOT initiate a window drag.

#### Scenario: Drag from title
- **WHEN** the user clicks and drags on the "AI Workbench" title text
- **THEN** the window moves with the drag

#### Scenario: Buttons are not drag targets
- **WHEN** the user clicks any button in the title bar (settings, minimize, maximize/restore, close)
- **THEN** the button action fires and the window does not drag
