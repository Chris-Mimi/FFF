This document is only for Chris and should NEVER be read by Claude. 
It should be committed and pushed as all other changes are.

This document is a template with headings to show me where the issue is or where the improvement needs to be, or simply reminders for me as I'm working on other thoings and I have an idea. Headings appear inside "#". If they are not followed by a "*" and text, ignore them, otherwise, read the text and act accordingly.

# Mobile URL #
http://192.168.178.75:3000



# FIRST. FIX BUGS MAKE IMPROVEMENTS #
# Coach Login #
* Mimi's iPhone copy/paste & delete function
* Box WiFi: Mac gets IPv6-only (no IPv4), dev sites (GitHub/Supabase/Vercel/Resend) unreachable. PC on same box WiFi works fine. At home all works. Debug next time at the box — see `SESSION-HANDOFF-S303-DNS-issue.md` for diagnostic history.
* IDEA: Put names of booked athletes in Whiteboard Intro so they also go into Google Calendar or find another way to register them in Google Calendar.
* iphone bug (I think) Coach-side: Workouts search box: Mimi can't type anything in the search box
* Mimi couldn't add a trial athlete
* 
* 
* Kids 1.7, 27.7 31.7 needs exercises

Athletes app: Give me the possibility to send Athletes who pay for the app a message.
* 
* NOTE: Eufy clip saved to Mac: Foam roller movements from 10.06.26 to sav e to YT and then link in app exercises.
Need DOB: Engels Frida, Frieda Stromer, Leopold Wischhöfer, Nico Enzmann, 
Ask Mimi Silvia Maritati (Diapers & Dumbbells?)
* Review what the section filter chips do in the Workouts page. 
* New protocol: memory-bank/whiteboard-score-entry-protocol.md. Next time, just say "run the whiteboard protocol for [photo]" and give the name of the WOD and the date/s and times. Give also any Drop-ins or unknown names in the session. Whether it's an RM/Strength day or a MetCon. I'll: pull the image → transcribe to a verification table → you confirm → map names via the list → write lift_records + WSR → verify one session → parity check. 
* IDEA for new app. Piano tutorials, YT clips, own recordings and sheet music all in one webapp


* At-Risk put the list in order from most recent to least recent attendance
* Weekend WOD #26.2 not done by selected first showed correctly then did not appear
* 

* 
* One thing I'd flag for later (not now): the parallel-session "move" still loses the athlete's whiteboard score for that day (the re-add doesn't carry it over) — only their PR is now safe. A proper one-click "move booking that keeps the score" is the real cure, but that's a feature, not a bug fix. Want me to note it in the memory bank for a future session? - I don't understand, explain in simple terms.
* Macbook still has internet problem at the box. Old Macbook Pro works fine.
Script works. Baseline + a sample capture both saved to ~/mac-incident-data/.

When the problem next happens — here's exactly what to do:

Open Terminal (or use a Terminal window that's already open — don't try to launch new apps when the system is jammed)
Type: ~/mac-incident-data/capture.sh and press Enter
Takes ~10 seconds; outputs a timestamped file
Then do your usual recovery (Cmd+Option+Esc or hard restart)
Next session, tell me to read the incident file and we'll compare it to the baseline

* Exercise library: 
* review the rep max calculator to show clearer percentages
* 

* Why doesn't the data integrity sql catch things like this?
* Planner: click on an exercise in the planner grid and it shows all the instances of that exercise in the workouts
* How it works/info/help file like in Planner
* Review and check how DNF is displayed and used in the athlete leaderboard.

# Coach library #

# Workout Library tab (coach) #
Integration with website


Athlete login:

 # Edit Workout Modal (coach) #
Once athletes start registering, you can re-run this script anytime to check the state:
npx tsx scripts/check-whiteboard-name-conflicts.ts

  # Publish Workout Modal (coach) #
 IMPROVEMENTS/Bug Fixes:

 # Exercises tab (coach) #
 IMPROVEMENTS/Bug Fixes:

# Analysis page

# Calendar View #
*

# Athlete Published Workouts Page #
Should only show the days on which athlete has attended a workout. For example, if athletes have not attended a workout on a day, the day should not be displayed.

# Athlete Leaderboard Page #

# Member Management Page #

- 🟢 HELPFUL NOTES:
* Planning Grid terminology: the filled marker is a "coverage dot" (solid colored circle with a check = "this was covered that week"; the dashed empty one is the "planning circle" for future weeks). I'll use "coverage dot" precisely from here on.

Block 1

Sub UpdateRunningSummary()
    Dim ws As Worksheet
    Dim summarySheet As Worksheet
    Dim lastRow As Long
    Dim summaryLastRow As Long
    Dim i As Long
    Dim j As Long
    Dim currentName As String
    Dim currentCount As Variant
    Dim nameFound As Boolean
    
    Set ws = ActiveSheet
    
    ' Create or get the Summary sheet
    On Error Resume Next
    Set summarySheet = Worksheets("Running Total")
    On Error GoTo 0
    
    If summarySheet Is Nothing Then
        ' Create new sheet if it doesn't exist
        Set summarySheet = Worksheets.Add(After:=Worksheets(Worksheets.Count))
        summarySheet.Name = "Running Total"
        summarySheet.Cells(1, 1).Value = "Name"
        summarySheet.Cells(1, 2).Value = "Total Count"
        summaryLastRow = 1
    End If
    
    ' Find last row in current sheet
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    
    ' Find last row in summary sheet
    summaryLastRow = summarySheet.Cells(summarySheet.Rows.Count, "A").End(xlUp).Row
    
    ' Loop through each row in current sheet where column D has a value
    For i = 3 To lastRow
        currentName = ws.Cells(i, 1).Value
        currentCount = ws.Cells(i, 4).Value
        
        ' Only process if there's a count in column D
        If currentName <> "" And currentCount <> "" And IsNumeric(currentCount) Then
            nameFound = False
            
            ' Check if name already exists in summary sheet
            For j = 2 To summaryLastRow
                If summarySheet.Cells(j, 1).Value = currentName Then
                    ' Add to existing total
                    summarySheet.Cells(j, 2).Value = summarySheet.Cells(j, 2).Value + currentCount
                    nameFound = True
                    Exit For
                End If
            Next j
            
            ' If name not found, add new row
            If Not nameFound Then
                summaryLastRow = summaryLastRow + 1
                summarySheet.Cells(summaryLastRow, 1).Value = currentName
                summarySheet.Cells(summaryLastRow, 2).Value = currentCount
            End If
        End If
    Next i
    
    ' Sort summary sheet by total count (largest to smallest)
    If summaryLastRow > 1 Then
        With summarySheet.Sort
            .SortFields.Clear
            .SortFields.Add Key:=summarySheet.Range("B2"), Order:=xlDescending
            .SetRange summarySheet.Range("A1:B" & summaryLastRow)
            .Header = xlYes
            .Apply
        End With
    End If
    
    MsgBox "Running total updated in 'Running Total' sheet!"
End Sub
Block 2

Sub InsertWeekInfo_ActiveSheetOnly()
    Dim ws As Worksheet
    Dim weekNum As Integer
    Dim yearToUse As Integer
    Dim startDate As Date
    Dim endDate As Date
    Dim sheetName As String

    Set ws = ActiveSheet
    sheetName = ws.Name

    ' Extract week number from sheet name, e.g. "Wk 23"
    If sheetName Like "Wk *" Then
        weekNum = CInt(Replace(sheetName, "Wk ", ""))
    Else
        MsgBox "Sheet name must be in the format 'Wk XX'", vbExclamation
        Exit Sub
    End If

    ' Set the year manually
    yearToUse = 2026

    ' Get start and end date of ISO week
    startDate = ISOWeekStartDate(yearToUse, weekNum)
    endDate = startDate + 6

    With ws
        .Range("D1").Value = "Week " & weekNum
        .Range("E1").Value = startDate
        .Range("F1").Value = endDate

        ' Format as two-digit year: dd/mm/yy
        .Range("E1:F1").NumberFormat = "dd/mm/yy"
        .Columns("D:F").AutoFit
    End With

    MsgBox "Week info inserted on sheet '" & sheetName & "'"
End Sub

Function ISOWeekStartDate(year As Integer, weekNum As Integer) As Date
    Dim jan4 As Date
    Dim jan4Weekday As Integer
    Dim firstMonday As Date

    jan4 = DateSerial(year, 1, 4)
    jan4Weekday = Weekday(jan4, vbMonday)
    firstMonday = jan4 - (jan4Weekday - 1)

    ISOWeekStartDate = firstMonday + (weekNum - 1) * 7
End Function
Block 3

Sub SelectAllDataRows()
    Dim lastRow As Long
    Dim dataRange As Range
    
    ' Find the last row with data in column A
    lastRow = Cells(Rows.Count, "A").End(xlUp).Row
    
    ' Select from row 3 to the last row with data, columns A through C
    If lastRow >= 3 Then
        Set dataRange = Range("A3:C" & lastRow)
        dataRange.Select
    Else
        MsgBox "No data found starting from row 3"
    End If
End Sub
Block 4

Sub SortAndRemoveDuplicates()
    Dim lastRow As Long
    Dim dataRange As Range
    Dim ws As Worksheet
    
    Set ws = ActiveSheet
    
    ' Find the last row with data in column A
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    
    ' Check if there's data
    If lastRow < 3 Then
        MsgBox "No data found starting from row 3"
        Exit Sub
    End If
    
    ' Set the data range
    Set dataRange = ws.Range("A3:C" & lastRow)
    
    ' Sort the data: Names (A), then Dates (B), then Times (C) - all ascending
    With ws.Sort
        .SortFields.Clear
        .SortFields.Add Key:=ws.Range("A3"), Order:=xlAscending
        .SortFields.Add Key:=ws.Range("B3"), Order:=xlAscending
        .SortFields.Add Key:=ws.Range("C3"), Order:=xlAscending
        .SetRange dataRange
        .Header = xlNo
        .Apply
    End With
    
    ' Remove duplicates based on Name (column 1) and Date (column 2)
    dataRange.RemoveDuplicates Columns:=Array(1, 2), Header:=xlNo
    
    MsgBox "Data sorted and duplicates removed!"
End Sub
Block 5

Sub CountNamesAtLastOccurrence()
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim j As Long
    Dim currentName As String
    Dim nameCount As Long
    Dim lastRowForName As Long
    Dim namesProcessed() As String
    Dim nameIndex As Long
    Dim alreadyProcessed As Boolean
    Dim dataRange As Range
    
    Set ws = ActiveSheet
    
    ' Find the last row with data
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    
    ' Clear column D first
    ws.Range("D3:D" & lastRow).ClearContents
    
    ' Initialize array
    ReDim namesProcessed(0)
    nameIndex = 0
    
    ' Loop through each row
    For i = 3 To lastRow
        currentName = ws.Cells(i, 1).Value
        
        If currentName <> "" Then
            ' Check if we've already processed this name
            alreadyProcessed = False
            For j = 1 To nameIndex
                If namesProcessed(j) = currentName Then
                    alreadyProcessed = True
                    Exit For
                End If
            Next j
            
            ' If not processed, count it and find last occurrence
            If Not alreadyProcessed Then
                nameCount = 0
                lastRowForName = 0
                
                ' Count and find last occurrence
                For j = 3 To lastRow
                    If ws.Cells(j, 1).Value = currentName Then
                        nameCount = nameCount + 1
                        lastRowForName = j
                    End If
                Next j
                
                ' Put count in column D at last occurrence
                ws.Cells(lastRowForName, 4).Value = nameCount
                
                ' Mark this name as processed
                nameIndex = nameIndex + 1
                ReDim Preserve namesProcessed(nameIndex)
                namesProcessed(nameIndex) = currentName
            End If
        End If
    Next i
    
    ' Sort by Column D (smallest to largest)
    Set dataRange = ws.Range("A3:D" & lastRow)
    
    With ws.Sort
        .SortFields.Clear
        .SortFields.Add Key:=ws.Range("D3"), Order:=xlAscending
        .SetRange dataRange
        .Header = xlNo
        .Apply
    End With
    
    MsgBox "Name counts added and data sorted by column D!"
End Sub
Block 6

Sub ResetAndRebuildSummary()
    Dim summarySheet As Worksheet
    Dim response As VbMsgBoxResult
    
    ' Ask for confirmation
    response = MsgBox("This will clear the Running Total sheet and you'll need to run UpdateRunningSummary on each monthly sheet again. Continue?", vbYesNo + vbQuestion, "Reset Running Total")
    
    If response = vbNo Then
        Exit Sub
    End If
    
    ' Get or create the Summary sheet
    On Error Resume Next
    Set summarySheet = Worksheets("Running Total")
    On Error GoTo 0
    
    If summarySheet Is Nothing Then
        Set summarySheet = Worksheets.Add(After:=Worksheets(Worksheets.Count))
        summarySheet.Name = "Running Total"
    End If
    
    ' Clear all data and set up headers
    summarySheet.Cells.Clear
    summarySheet.Cells(1, 1).Value = "Name"
    summarySheet.Cells(1, 2).Value = "Total Count"
    
    MsgBox "Running Total has been reset. Now run UpdateRunningSummary on each monthly sheet."
End Sub
