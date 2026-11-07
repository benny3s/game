@echo off
rem Nyangdoku puzzle bank top-up - registers Windows task "Benny-NyangBank" (daily 05:40, runs nyang\tools\bank_topup.py)
rem It only makes new 1,000-puzzle chunks when the top player is within 1,500 stages of the end (then commit + push).
rem Double-click once. To remove later: schtasks /Delete /TN Benny-NyangBank /F
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "$a = New-ScheduledTaskAction -Execute 'C:\Users\1\AppData\Local\Programs\Python\Python313\pythonw.exe' -Argument '-I C:\Users\1\Claude-Benny\game\nyang\tools\bank_topup.py' -WorkingDirectory 'C:\Users\1\Claude-Benny\game';" ^
 "$t = New-ScheduledTaskTrigger -Daily -At 05:40;" ^
 "$s = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew;" ^
 "$p = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited;" ^
 "Register-ScheduledTask -TaskName 'Benny-NyangBank' -Action $a -Trigger $t -Settings $s -Principal $p -Description 'Nyangdoku master puzzle bank top-up (game/nyang/tools/bank_topup.py)' -Force | Out-Null;" ^
 "'OK - next run: ' + (Get-ScheduledTask -TaskName 'Benny-NyangBank' | Get-ScheduledTaskInfo).NextRunTime"
if "%1"=="" pause
