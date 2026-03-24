from setuptools import setup, find_packages

with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='trae-autopilot',
    version='2.0.0',
    description='TRAE AutoPilot - 具备自我操控能力的AI开发团队',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='TRAE Project',
    author_email='support@trae.ai',
    url='https://trae.ai',
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'requests>=2.31.0',
        'python-dotenv>=1.0.0',
        'pyyaml>=6.0.1',
        'argparse>=1.4.0',
        'asyncio>=3.4.3',
    ],
    extras_require={
        'all': [
            'websockets>=12.0',
            'watchdog>=3.0.0',
            'colorama>=0.4.6',
        ],
        'dev': [
            'pytest>=7.4.0',
            'flake8>=6.0.0',
            'black>=23.3.0',
        ],
    },
    entry_points={
        'console_scripts': [
            'trae-autopilot=trae_autopilot.__main__:main',
        ],
    },
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Topic :: Software Development :: Build Tools',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
    ],
    python_requires='>=3.8',
)