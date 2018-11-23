node {
    env.NODEJS_HOME = "${tool 'node8.4.0'}"
    // on linux / mac voila3
    env.PATH="${env.NODEJS_HOME}/bin:${env.PATH}"
    
    stage('Checkout'){
        echo 'Pulling...' + env.BRANCH_NAME
        checkout scm   
    }
    
    stage('Build'){
        sh('npm install')
        sh('node ./node_modules/gulp/bin/gulp.js build --modules=modules.json')
        //sh ('mkdir playerdigiteka')
        
        dir('playerdigiteka') {
             git url: "ssh://ambrugeat@github.com/digiteka/playerDigiteka.git ",
                 credentialsId: '54c5b16a-e2aa-41f1-aff7-169154fd52f5',
                 branch: master

              // The rest of your Groovy here...

             //stage 'Use Git'
             // Do anything you like with your Git repo
             //sh 'git add -A && git commit -m "Update code" && git push origin master'
            //sh('git clone https://github.com/digiteka/playerDigiteka.git .')
            //sh('git checkout -f ft-' +env.BRANCH_NAME)
            //sh('cp ../prebid.js src/app/library/dtkplayer/addons/PrebidLibrary.js')
            //sh('git commit src/app/library/dtkplayer/addons/PrebidLibrary.js -m "Update Prebid Library from Jenkins"')
            //sh('git push origin ft-' +env.BRANCH_NAME)
        }
    }
    
    stage ('Deploy') {
        dir('build/dist'){
            sh 'scp -v -o StrictHostKeyChecking=no  prebid.js root@ovh-lb5.dginfra.net:/home/web/prod/ultimedia_v2/www/js/player-digiteka/prebid-'+env.BRANCH_NAME+'.js'
        }
     }
}
