# typestyle-es2015-experiment

> Module augmentation experiment with es2015

## Try it out

```sh
# get es2015 built typestyle
git clone https://github.com/TylorS/typestyle
cd typestyle
git checkout tylors/feat/add-es2015-builds
npm install
npm run build
npm link # link the thing

cd ../

git clone https://github.com/TylorS/typestyle-es2015-experiment
cd typestyle-es2015-experiment
npm install
npm link typestyle
npm run build
# prosper :D
```