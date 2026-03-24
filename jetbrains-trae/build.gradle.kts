plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.8.0"
    id("org.jetbrains.intellij") version "1.13.3"
}

group = "com.trae.autopilot"
version = "1.0"

repositories {
    mavenCentral()
}

intellij {
    version.set("2022.3.1")
    type.set("IC") // IntelliJ IDEA Community Edition
    plugins.set(listOf("Kotlin"))
}

dependencies {
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.4")
}

tasks {
    buildSearchableOptions {
        enabled = false
    }
    runIde {
        jvmArgs("-Xmx2G")
    }
}
