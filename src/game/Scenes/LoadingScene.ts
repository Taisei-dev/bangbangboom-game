import { Howl } from "howler"
import { Container, Loader, LoaderResource } from 'pixi.js'
import { Container as IOC, injectable, inject } from 'inversify'
import { GameLoadConfig, jsonNames, soundNames } from '../Core/GameConfig'
import { Resources, GlobalEvents, MainStage } from "../Utils/SymbolClasses"
import { LoadingLayer } from "../Layers/LoadingLayer"
import { BackgroundLayer } from "../Layers/BackgroundLayer"
import { ReadyScene } from "./ReadyScene"
import { SceneSwitcher } from "../Utils/SceneSwitcher"


@injectable()
export class LoadingScene extends Container {
    constructor(
        private ioc: IOC,
        // private stage: MainStage,
        config: GameLoadConfig,
    ) {
        super()

        const loader = new Loader()
        loader.pre(howlerMiddleware)

        loader.add("music", config.musicSrc, { loadType: LoaderResource.LOAD_TYPE.AUDIO })
        loader.add("background", config.backgroundSrc, { loadType: LoaderResource.LOAD_TYPE.IMAGE })
        loader.add("map", config.mapSrc, { loadType: LoaderResource.LOAD_TYPE.XHR })
        for (const key in jsonNames)
            loader.add(key, `${config.skin}/${jsonNames[key as keyof typeof jsonNames]}`)
        for (const key in soundNames)
            loader.add(key, `${config.skin}/${soundNames[key as keyof typeof soundNames]}`)


        loader.on("progress", this.progress)
        loader.on("error", this.error)
        loader.load(this.loaded)

        this.layer = ioc.resolve(LoadingLayer)
        this.addChild(this.layer)
    }

    private layer: LoadingLayer

    private loadedcount = 0
    private progress = (loader: Loader) => {
        this.loadedcount++
        let count = 0
        for (const key in loader.resources) count++

        this.layer.progress.set(this.loadedcount === count ? 1 : this.loadedcount / (count + 3))
    }

    private loaded = (loader: Loader, res: Partial<Record<string, LoaderResource>>) => {
        console.log("loaded")
        this.ioc.bind(Resources).toConstantValue(res)
        const stage = this.ioc.get(MainStage)

        stage.addChildAt(this.ioc.resolve(BackgroundLayer), 0)
        const ready = this.ioc.resolve(ReadyScene)

        const swicher = this.ioc.get(SceneSwitcher)
        swicher.switch(this, ready).outEnd.add(() => {
            this.destroy({ children: true })
            return "remove"
        })
    }

    private alertedError = false
    private error = (err: Error, loader: Loader, res: LoaderResource) => {
        console.error("load ", res, " error:", err)
        if (!this.alertedError) {
            alert("load " + res.url + " error: " + err)
            this.alertedError = true
        }
    }
}


function howlerMiddleware(resource: LoaderResource, next: () => void) {
    if (resource.loadType !== LoaderResource.LOAD_TYPE.AUDIO) {
        next()
        return
    }

    const howl = new Howl({
        src: resource.url,
        format: /\..{1,5}$/.test(resource.url) ? undefined : "mp3",
        onload: () => {
            resource.data = howl
            resource.complete()
            next()
        },
        onloaderror: (id, err) => {
            resource.error = err
            resource.abort("load error")
            next()
        }
    })
}


