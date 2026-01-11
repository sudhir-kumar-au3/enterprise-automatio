# Calendar Export Feature

## Overview
The Enterprise Automation Architecture dashboard now includes comprehensive calendar export functionality, allowing you to integrate task deadlines and roadmap milestones with your preferred calendar application.

## Features

### 1. Task Calendar Export (Team Collaboration View)
Export tasks with due dates to iCal format for seamless integration with external calendar applications.

**Export Options:**
- **All Tasks**: Export all tasks with due dates, filtered by your current assignee selection
- **Current Month**: Export only tasks due in the currently displayed month
- **Selected Day**: Export tasks due on a specific selected day

**Quick Actions:**
- **Google Calendar Integration**: Single-click to add the first task from a selected day directly to Google Calendar

### 2. Roadmap Export
Export implementation phases and tasks with estimated timelines to iCal format.

**Export Options:**
- **Complete Roadmap**: Export all phases and tasks with auto-generated timeline estimates
- **Individual Phases**: Export specific phases (Phase 1, Phase 2, or Phase 3) separately
- **Phase Export Button**: Quick export from within each expanded phase accordion

### 3. iCal Format Compatibility
The exported `.ics` files are fully compatible with:
- **Apple Calendar** (macOS, iOS, iPadOS)
- **Google Calendar** (web, mobile)
- **Microsoft Outlook** (desktop, web, mobile)
- **Mozilla Thunderbird**
- **Any RFC 5545 compliant calendar application**

## Using Exported Calendars

### Import to Apple Calendar
1. Click the "Export Calendar" button and select your desired option
2. The `.ics` file will download automatically
3. Double-click the downloaded file
4. Apple Calendar will open and prompt to add the events
5. Choose your preferred calendar and click "OK"

### Import to Google Calendar
1. Export your tasks/roadmap to `.ics` format
2. Open Google Calendar (calendar.google.com)
3. Click the "+" next to "Other calendars"
4. Select "Import"
5. Choose the downloaded `.ics` file
6. Select the target calendar and click "Import"

### Import to Microsoft Outlook
1. Export and download the `.ics` file
2. Open Outlook
3. Go to File > Open & Export > Import/Export
4. Select "Import an iCalendar (.ics) or vCalendar file"
5. Browse to your downloaded file and click "OK"

### Quick Add to Google Calendar
For single tasks, use the "Add to Google Calendar" option which opens a pre-filled event form in a new browser tab.

## Event Details

### Task Events Include:
- **Title**: Task name (or "Phase X: Task Name" for roadmap tasks)
- **Description**: Task description and phase information
- **Due Date**: Scheduled as an all-day event on the due date
- **Priority**: Mapped to calendar priority (1=critical, 3=high, 5=medium, 7=low)
- **Status**: TENTATIVE for todo tasks, CONFIRMED for in-progress/done tasks
- **Location**: Context information (Service Implementation, Workflow Design, etc.)
- **Reminder**: 24-hour advance notification (customizable in your calendar app)

### Roadmap Events Include:
- **Title**: Full phase and task context
- **Description**: Phase details and duration
- **Estimated Timeline**: Auto-calculated based on phase sequencing
- **Priority**: Inherited from phase priority
- **Context**: Roadmap phase information

## Technical Details

### iCal Standard Compliance
- Follows RFC 5545 (iCalendar specification)
- Uses UTC timestamps for cross-timezone compatibility
- Properly escapes special characters in text fields
- Includes VALARM components for reminders

### Task Timeline Estimation
For roadmap exports, timelines are estimated as:
- **Phase 1**: Starting from current date
- **Phase 2**: 90 days after Phase 1 start
- **Phase 3**: 180 days after Phase 1 start
- Tasks within each phase are distributed evenly across the phase duration

### Export Feedback
- Success toasts confirm export completion
- Error toasts alert when no tasks are available
- Clear messaging for disabled options

## Tips & Best Practices

1. **Filter Before Export**: Use the assignee filter to export only your tasks
2. **Regular Exports**: Re-export when tasks change to keep calendars in sync
3. **Separate Calendars**: Import each phase to a different calendar for better organization
4. **Calendar Layers**: Keep imported tasks in a separate calendar layer for easy toggling
5. **Reminders**: Customize reminder times in your calendar app after import
6. **Color Coding**: Use calendar color-coding to distinguish priority levels

## Troubleshooting

**Problem**: Calendar app doesn't recognize the file
- **Solution**: Ensure the file extension is `.ics` (should happen automatically)

**Problem**: Events appear at wrong times
- **Solution**: Check your calendar app's timezone settings (exports use UTC)

**Problem**: No export option appears
- **Solution**: Ensure tasks have due dates assigned (tasks without dates aren't exported)

**Problem**: Export button is disabled
- **Solution**: Add due dates to tasks or select a day with scheduled tasks

## Future Enhancements
- Bi-directional sync with calendar services
- Recurring task support
- Custom reminder intervals
- Calendar subscription URLs (live sync)
- Milestone tracking and progress updates
