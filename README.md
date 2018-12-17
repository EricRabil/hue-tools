# hue-tools
A library and CLI for various Hue lighting environments

> This project is made for my own enjoyment. It comes with no guaranteed updates, fixes, support, etc.

```bash
# this
node cli

# help
node cli help

# sets light state
node cli state --groups=0 --state.on=true --save=allOn
node cli state --load=allOn

# starts a wave color gradient that gradually takes over all lights group by group
node cli scene start wave --transition=2500 --groups=1 2 3 4

# strobe.
node cli scene start strobe --transition=150 --groups=0

# starts a constant color gradient across all lights
node cli scene start gradient --transition=5000 --rgbProfile=sunset --groups=0 --save=sunset
node cli scene start gradient --load=sunset

# visualizes sounds from your mic using rec
node cli scene start sound --transition=700 --groups=0
```