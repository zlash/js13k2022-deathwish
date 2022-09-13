# JS13K 2022 - DEATH

## Bonus! Script to generate unicode size bar 

```javascript
{k=1234/1024;for(i=f=0,s="";i<6;f=6*k/13-i,s+=f<=0?"🌑":["🌘","🌗","🌖","🌕"][((f>1?1:f)*3)|0],i++);`${s} ${(k*1000|0)/1000} KiB / 13 KiB #js13k`}
```
