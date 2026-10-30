@echo off
rem Game site nightly QA - registers Windows task "Benny-GameQA" (daily 04:30, runs test\qa\nightly.py)
rem Double-click once. To remove later: schtasks /Delete /TN Benny-GameQA /F
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "$a = New-ScheduledTaskAction -Execute 'C:\Users\1\AppData\Local\Programs\Python\Python313\pythonw.exe' -Argument '-I C:\Users\1\Claude-Benny\game\test\qa\nightly.py' -WorkingDirectory 'C:\Users\1\Claude-Benny\game';" ^
 "$t = New-ScheduledTaskTrigger -Daily -At 04:30;" ^
 "$s = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 50) -MultipleInstances IgnoreNew;" ^
 "$p = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited;" ^
 "Register-ScheduledTask -TaskName 'Benny-GameQA' -Action $a -Trigger $t -Settings $s -Principal $p -Description 'Game site nightly QA (game/test/qa/nightly.py)' -Force | Out-Null;" ^
 "'OK - next run: ' + (Get-ScheduledTask -TaskName 'Benny-GameQA' | Get-ScheduledTaskInfo).NextRunTime"
pause
